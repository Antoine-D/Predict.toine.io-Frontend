var express = require("express");
var app     = express();
var bodyParser = require("body-parser");
var path = require("path");


var mongodb = require('mongodb');
var mongoClient = mongodb.MongoClient;
var mongoUrl = 'mongodb://localhost:27017/predict';

var schedule = require('node-schedule');

var db;
var mongoError;
mongoClient.connect(mongoUrl, function (error, database) { 
    db = database;
    mongoError = error;
    console.log("starting....");
});

/* Encryption tools */
var crypto = require('crypto'),
    algorithm = 'aes-256-ctr',
    password = 'q9A7Xgls';

function encrypt(text) {
    var cipher = crypto.createCipher(algorithm, password)
    var crypted = cipher.update(text, 'utf8', 'hex')
    crypted += cipher.final('hex');
    return crypted;
}

function decrypt(text) {
    var decipher = crypto.createDecipher(algorithm, password)
    var dec = decipher.update(text, 'hex', 'utf8')
    dec += decipher.final('utf8');
    return dec;
}

// configuring express to use body-parser as middle-ware.
app.use(bodyParser.urlencoded({ extended: false }));

/* Serving static files */
// serve the home page (used for nav and to search predictions by predictor
app.get('/',function(req,res) {
    res.sendFile(path.join(__dirname+"/index.html"));
});
// serves the create page (used to create a prediction)
app.get('/create',function(req,res) {
    res.sendFile(path.join(__dirname+"/create.html"));
});
// serves the predictor page (displays all predictions created by a predictor)
app.get('/predictor',function(req,res) {
    res.sendFile(path.join(__dirname+"/predictor.html"));
});
// serves the prediction page (displays a single prediction)
app.get('/prediction',function(req,res) {
    res.sendFile(path.join(__dirname+"/prediction.html"));
});

app.use("/assets", express.static(__dirname + '/assets'));

/** 
  * Get all objects of the given type
  */
var objectsRouter = express.Router();
app.use('/objects', objectsRouter);
objectsRouter.use(function (req, res, next) {
    var url = require('url');
    var url_parts = url.parse(req.originalUrl, true);

    var findQueryObject = {};

    var paramatersValid = false;
    var includeObjectValues = false;

    // grab the "type" paramater from the GET request
    if (url_parts.query.hasOwnProperty("type")) {
        findQueryObject.type = url_parts.query.type;
        paramatersValid = true;
    }
    // grab the "object" paramater from the GET request
    if (url_parts.query.hasOwnProperty("object")) {
        findQueryObject.object = url_parts.query.object;
    }
    // grab the "includeValues" paramater from the GET request
    if (url_parts.query.hasOwnProperty("includeValues") 
        && url_parts.query.includeValues.toLowerCase() == "y") {
        includeObjectValues = true;

        // Check if the time interval is specified as a paramater
        // which will dictate lower and upper bound of times of prices to fetch.
        if (url_parts.query.hasOwnProperty("start")) {
            var startTime = url_parts.query.start;
            if (!findQueryObject.hasOwnProperty("values")) {
                findQueryObject.values = { $elemMatch: { time: {} } };
            }
            findQueryObject.values.$elemMatch.time.$gte = startTime;
        }
        if (url_parts.query.hasOwnProperty("end")) {
            var endTime = url_parts.query.end;
            if (!findQueryObject.hasOwnProperty("values")) {
                findQueryObject.values = { $elemMatch: { time: {} } };
            }
            findQueryObject.values.$elemMatch.time.$lte = endTime;
        }
    }

    if (paramatersValid) {
        if (!mongoError) {
            var objectsCollection = db.collection('objects');
            objectsCollection.find(findQueryObject).toArray(function (err, result) {
                res.setHeader('Content-Type', 'application/json');
                res.send(JSON.stringify({objects: result}));
            });
        }
    }

    else {
        res.setHeader('Content-Type', 'application/json');
        res.send(JSON.stringify({ status: "failed", reason: "Required paramaters are missing."}));
    }
});

/** 
  * Predictions router
  */
var predictionsRouter = express.Router();
app.use('/predictions', predictionsRouter);
predictionsRouter.use(function (req, res, next) {
    var url = require('url');
    var url_parts = url.parse(req.originalUrl, true);

    var findQueryObject = {};
    var paramatersValid = false;

    // grab the "id" paramater from the GET request
    if (url_parts.query.hasOwnProperty("id")) {
        findQueryObject._id = new mongodb.ObjectID(String(url_parts.query.id));
        paramatersValid = true;
    }

    // grab the "predictor" paramater from the GET request
    if (url_parts.query.hasOwnProperty("predictor")) {
        findQueryObject.predictor = url_parts.query.predictor;
        paramatersValid = true;
    }

    if (paramatersValid) {
        if (!mongoError) {
            var predictionsCollection = db.collection('predictions');
            // get all the stock's symbols and names from the table
            predictionsCollection.find(findQueryObject).toArray(function (err, result) {
                // build the response object
                var responseObject = {};
                responseObject.predictions = result;
                responseObject.status = "success";
                responseObject.reason = "";
                // send the response in JSON format
                res.setHeader('Content-Type', 'application/json');
                res.send(JSON.stringify(responseObject));
            });
        }
        else {
            res.setHeader('Content-Type', 'application/json');
            res.send(JSON.stringify({ status: "failed", reason: "Error occured during database query." }));
        }
    }

    else {
        res.setHeader('Content-Type', 'application/json');
        res.send(JSON.stringify({ status: "failed", reason: "Required paramaters are missing."}));
    }
});


/** 
  * Values router
  */
var valuesRouter = express.Router();
app.use('/values', valuesRouter);
valuesRouter.use(function (req, res, next) {
    var url = require('url');
    var url_parts = url.parse(req.originalUrl, true);

    var finalMatchObject = null;
    var firstMatchObject = {$match: {}};

    var paramatersValid = false;

    // grab the "type" and "object" paramater from the GET request
    if (url_parts.query.hasOwnProperty("type") &&
        url_parts.query.hasOwnProperty("object")) {
        firstMatchObject.$match.type = url_parts.query.type;
        firstMatchObject.$match.object = url_parts.query.object;
        paramatersValid = true;
        // both start and end time are paramaters
        if (url_parts.query.hasOwnProperty("start") && url_parts.query.hasOwnProperty("end")) {
            var startTime = parseInt(url_parts.query.start);
            var endTime = parseInt(url_parts.query.end);
            finalMatchObject = {$match : {"values.time" : {$lte : endTime, $gte : startTime}}};
        }
        // only start time is a paramater
        else if (url_parts.query.hasOwnProperty("start")) {
            var startTime = parseInt(url_parts.query.start);
            finalMatchObject = {$match : {"values.time" : {$gte : startTime}}};
        }
        // only end time is a paramater
        else if (url_parts.query.hasOwnProperty("end")) {
            var endTime = parseInt(url_parts.query.end);
            finalMatchObject = {$match : {"values.time" : {$lte : endTime}}};
        }
    }

    var aggregateArray =  Array();
    aggregateArray.push(firstMatchObject);
    aggregateArray.push({ $unwind : "$values" });
    if(finalMatchObject != null) {
        aggregateArray.push(finalMatchObject);
    }

    if (paramatersValid) {
        if (!mongoError) {
            var objectsCollection = db.collection('objects');
            // get all the stock's symbols and names from the table
            objectsCollection.aggregate(aggregateArray).toArray(function (err, result) {
                res.setHeader('Content-Type', 'application/json');
                res.send(JSON.stringify(result));
            });
        }
        else {
            res.setHeader('Content-Type', 'application/json');
            res.send(JSON.stringify({ status: "failed", reason: "Error occured during database query." }));
        }
    }

    else {
        res.setHeader('Content-Type', 'application/json');
        res.send(JSON.stringify({ status: "failed", reason: "Required paramaters are missing." }));
    }
});


/**
  * Insert a prediction into the predictions collection
  */
var insertPrediction = function (res, predictorCypher, predictionCreateObject) {
    var currentTime = Math.floor(new Date().getTime() / 1000);
    db.collection('predictions').insertOne({
        predictor: predictorCypher,
        type: predictionCreateObject.type,
        object: predictionCreateObject.object,
        value: predictionCreateObject.value,
        action: predictionCreateObject.action,
        start: currentTime,
        end: predictionCreateObject.end
    }, function (err, result) {
        // redirect user the the new prediction
        res.writeHead(301, { Location: "http://104.131.219.239:3060/predictions?id=" + result.ops[0]._id });
        res.end();
        /*res.setHeader('Content-Type', 'application/json');
        res.send(JSON.stringify({ status: "success", record: result }));*/
    });
};


/**
  * Insert a prediction into the predictions collection
  */
var insertPredictorThenPrediction = function (res, callback, predictionCreateObject) {
    var predictorCypher = encrypt(predictionCreateObject.predictor);
    db.collection('predictors').insertOne({
        predictor: predictionCreateObject.predictor,
        cypher: predictorCypher
    }, function (err, result) {
        callback(res, predictorCypher, predictionCreateObject);
    });
};


/**
  * Receive prediction creation posts and insert them in the collection
  */
app.post('/createprediction', function(req, res) {

    console.log(req.body);
    
    // Make sure all of the required fields are in the request body
    if (req.body != null &&
        "predictor" in req.body &&
        "type" in req.body &&
        "object" in req.body &&
        "value" in req.body &&
        "action" in req.body &&
        "end" in req.body) {
        // create the prediction object to insert
        var predictionCreateObject = {};
        predictionCreateObject.predictor = req.body.predictor;
        predictionCreateObject.type = req.body.type;
        predictionCreateObject.object = req.body.object;
        predictionCreateObject.value = req.body.value;
        predictionCreateObject.action = req.body.action;
        predictionCreateObject.end = parseInt(req.body.end);
        // insert the prediction
        if (!mongoError) {
            var predictorCollection = db.collection('predictors');
            // check to see if the predictor exists in the predictor collection
            predictorCollection.find({ predictor: predictionCreateObject.predictor }).toArray(function (err, result) {
                // if the predictor exists, then insert prediction with the retreived predictor _id
                if (result.length > 0) {
                    insertPrediction(
                        res,
                        result[0].cypher,
                        predictionCreateObject);
                }
                // if the predictor doesn't exist, then insert the predictor and then insert the prediction
                else {
                    insertPredictorThenPrediction(
                        res,
                        function (res, predictorId, predictionObject) {
                            insertPrediction(res, db, predictorId, predictionObject)
                        },
                        predictionCreateObject);
                }
            });
        }

        else {
            res.setHeader('Content-Type', 'application/json');
            res.send(JSON.stringify({ status: "failed", reason: "Error occured during database query." }));
        }
    }
    // some or all of the required fields were not present
    else {
        res.setHeader('Content-Type', 'application/json');
        res.send(JSON.stringify({ status: "failed", reason: "Required paramaters are missing." }));
    }
});

app.listen(3060);
