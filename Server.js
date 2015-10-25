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

app.use("/assets", express.static(__dirname + '/assets'));

/** 
  * Predictors router
  */
var predictorRouter = express.Router();
app.use('/predictors', predictorRouter);
predictorRouter.use(function (req, res, next) {
    var url = require('url');
    var url_parts = url.parse(req.originalUrl, true);

    var findQueryObject = {};
    var paramatersValid = false;

    // grab the "type" paramater from the GET request
    if (url_parts.query.hasOwnProperty("name")) {
        findQueryObject.type = url_parts.query.type;
        paramatersValid = true;
    }
    else if (url_parts.query.hasOwnProperty("id")) {
        findQueryObject.type = url_parts.query.type;
        paramatersValid = true;
    }
});

/** 
  * Objects Router (search for objects and assosiated attributes)
  */
var objectsRouter = express.Router();
app.use('/objects', objectsRouter);
objectsRouter.use(function (req, res, next) {
    var url = require('url');
    var url_parts = url.parse(req.originalUrl, true);

    var findQueryObject = {};
    var paramatersValid = false;

    // grab the "type" paramater from the GET request
    if (url_parts.query.hasOwnProperty("type")) {
        findQueryObject.type = url_parts.query.type;
        paramatersValid = true;
    }
    // grab the "object" paramater from the GET request
    if (url_parts.query.hasOwnProperty("object")) {
        findQueryObject.object = url_parts.query.object;
    }
    // if the paramaters are valid (have at least the object type, then )
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
  * Prediction router (for single prediction (serves a page))
  */
var predictionRouter = express.Router();
app.use('/prediction', predictionRouter);
predictionRouter.use(function (req, res, next) {
    res.sendFile(path.join(__dirname+"/prediction.html"));
});

/** 
  * Predictions router (for getting predictions as JSON)
  */
var predictionsRouter = express.Router();
app.use('/predictions', predictionsRouter);
predictionsRouter.use(function (req, res, next) {
    res.setHeader('Content-Type', 'application/json');
    var url = require('url');
    var url_parts = url.parse(req.originalUrl, true);

    var findQueryObject = {};
    var paramatersValid = false;

    // grab the "id" paramater from the GET request
    if (url_parts.query.hasOwnProperty("id")) {
        var checkForHexRegExp = new RegExp("^[0-9a-fA-F]{24}$");
        if(checkForHexRegExp.test(String(url_parts.query.id))) {
            findQueryObject._id = new mongodb.ObjectID(String(url_parts.query.id));
            paramatersValid = true;
        }
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
                // send the response in JSON format
                res.send(JSON.stringify(result));
            });
        }
        else {
            res.send(JSON.stringify({ status: "failure", reason: "Error occured during database query." }));
        }
    }

    else {
        res.send(JSON.stringify({ status: "failure", reason: "Required paramaters are missing."}));
    }
});


/** 
  * Values router
  */
var valuesRouter = express.Router();
app.use('/values', valuesRouter);
valuesRouter.use(function (req, res, next) {
    // go through the parmaters, appending to the find object that will search for 
    // the values in the values collection.
    var findQueryObject = {};
    var url = require('url');
    var url_parts = url.parse(req.originalUrl, true);
    // assume paramaters not valid and is NOT a historical values query
    var paramatersValid = false;
    var isHistoricalValuesQuery = false;

    // grab the "type" and "object" paramater from the GET request
    if (url_parts.query.hasOwnProperty("type") &&
        url_parts.query.hasOwnProperty("object")) {
        findQueryObject.type = url_parts.query.type;
        findQueryObject.object = url_parts.query.object;
        paramatersValid = true;
    }

    // check if it's a historical values query
    if (url_parts.query.hasOwnProperty("queryType")) {
        if(url_parts.query.queryType.toLowerCase() == "historical") {
            isHistoricalValuesQuery = true;
        }
    }

    // if the paramaters are valid, grab the values
    if(paramatersValid) {
        var collectionToSearch;

        if(isHistoricalValuesQuery) {
            collectionToSearch = db.collection('historicalValues');

            // get the month if it's a paramater
            if (url_parts.query.hasOwnProperty("month")) {
                var month = parseInt(url_parts.query.month);
                findQueryObject.month = month;
            }
            // get the year if it's a paramater
            if (url_parts.query.hasOwnProperty("year")) {
                var year = parseInt(url_parts.query.year);
                findQueryObject.year = year;
            }
        }

        else {
            collectionToSearch = db.collection('values');

            // get start time (lower bound) if it's a paramater
            if (url_parts.query.hasOwnProperty("start")) {
                if(!findQueryObject.hasOwnProperty("time")) {
                    findQueryObject.time = {};
                }
                var startTime = parseInt(url_parts.query.start);
                findQueryObject.time.$gte = startTime;
            }

            // get end time (upper bound) if it's a paramater
            if (url_parts.query.hasOwnProperty("end")) {
                if(!findQueryObject.hasOwnProperty("time")) {
                    findQueryObject.time = {};
                }
                var endTime = parseInt(url_parts.query.end);
                findQueryObject.time.$lte = endTime;
            }
        }

        collectionToSearch.find(findQueryObject).toArray(function (err, result) {
            res.setHeader('Content-Type', 'application/json');
            res.send(JSON.stringify(result));
        });
    }
});

/**
  * Insert a prediction into the predictions collection
  */
var insertPrediction = function (res, predictorCypher, predictionCreateObject) {
    console.log(new Buffer(predictorCypher).toString('utf8'));
    var currentTime = Math.floor(new Date().getTime() / 1000);
    db.collection('predictions').insertOne({
        predictor: new Buffer(predictorCypher).toString('utf8'),
        type: predictionCreateObject.type,
        object: predictionCreateObject.object,
        value: predictionCreateObject.value,
        action: predictionCreateObject.action,
        start: currentTime,
        end: predictionCreateObject.end,
        status: "active"
    }, function (err, result) {
        if(typeof result != "undefined") {
            // redirect user the the new prediction
            res.writeHead(301, { Location: "http://104.131.219.239:3060/prediction/" + result.ops[0]._id });
            res.end();
        }
        else {
            res.setHeader('Content-Type', 'application/json');
            res.send("Error");
        }
        
    });
};


/**
  * Insert a prediction into the predictions collection
  */
var insertPredictorThenPrediction = function (res, callback, predictionCreateObject) {
    var predictorCipher = encrypt(predictionCreateObject.predictor);
    db.collection('predictors').insertOne({
        predictor: predictionCreateObject.predictor,
        cypher: new Buffer(predictorCipher).toString('utf8')
    }, function (err, result) {
        callback(res, predictorCipher, predictionCreateObject);
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
                    var predictorCipher = encrypt(result[0].predictor);
                    insertPrediction(
                        res,
                        predictorCipher,
                        predictionCreateObject);
                }
                // if the predictor doesn't exist, then insert the predictor and then insert the prediction
                else {
                    insertPredictorThenPrediction(
                        res,
                        function (res, predictorCipher, predictionObject) {
                            insertPrediction(res, predictorCipher, predictionObject)
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
