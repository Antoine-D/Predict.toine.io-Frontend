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

// configuring express to use body-parser as middle-ware.
app.use(bodyParser.urlencoded({ extended: false }));

app.get('/',function(req,res) {
    res.sendFile(path.join(__dirname+"/index.html"));
});

app.get('/create',function(req,res) {
    res.sendFile(path.join(__dirname+"/create.html"));
});

app.get('/predictor',function(req,res) {
    res.sendFile(path.join(__dirname+"/predictor.html"));
});

app.get('/prediction',function(req,res) {
    res.sendFile(path.join(__dirname+"/prediction.html"));
});

// Static files
app.use("/assets", express.static(__dirname + '/assets'));

// predictions
var prediction = { predictor_id: "507f1f77bcf86cd799439011", type: "stock", object: "AAPL", value: 101.10, action: "rise above", start: 1444000001, end: 1444100000 };

// predictors
var predictor = { predictor: "anemail@gmail.com" };

// objects' values
var object = { type: "", object: "", values: [{ time: 1444000001, value: 9.77 }, { time: 1444000061, value: 9.72 }] };
var stockObject = { type: "stock", object: "AAPL", company: "Apple Inc.", values: [{ time: 1444000001, value: 109.77 }, { time: 1444000061, value: 109.72 }] };

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
                // grab the objects from the table (include the values also if specified they're wanted in the query).
                var objectsArray = Array();
                for(var i = 0; i < result.length; i++) {
                    var singleObject = {};
                    for(var propertyName in result[i]) {
                        if(propertyName != "values" || includeObjectValues) {
                            singleObject[propertyName] = result[i][propertyName];
                        }
                    }

                    objectsArray.push(singleObject);
                }

                res.setHeader('Content-Type', 'application/json');
                res.send(JSON.stringify({objects: objectsArray}));
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
var insertPrediction = function (res, predictorId, predictionCreateObject) {
    var currentTime = Math.floor(new Date().getTime() / 1000);
    db.collection('predictions').insertOne({
        predictor_id: predictorId,
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
    db.collection('predictors').insertOne({
        predictor: predictionCreateObject.predictor
    }, function (err, result) {
        callback(res, result.ops[0]._id, predictionCreateObject);
    });
};


/**
  * Receive prediction creation posts and insert them in the collection
  */
/*var createPredictionRouter = express.Router();
app.use('/createprediction', createPredictionRouter);
createPredictionRouter.use(function (req, res, next) {*/
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
                        result[0]._id,
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
