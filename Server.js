var express = require("express");
var app     = express();
var bodyParser = require("body-parser");
var path = require("path");


var mongodb = require('mongodb');
var mongoClient = mongodb.MongoClient;
var mongoUrl = 'mongodb://localhost:27017/predict';

var schedule = require('node-schedule');

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

// update the stocks every 1 minuite
schedule.scheduleJob('01 * * * * *', function() {
    var YQL = require('yql');
    var queryString = "select * from yahoo.finance.quote where symbol in ('AAPL') "
    var queryYQL = new YQL(queryString);

    queryYQL.exec(function(err, data) {
        //console.log(data.query.results);
        //store the price
        var currentTime = Math.floor(new Date()/1000);

        mongoClient.connect(mongoUrl, function (mongoError, db) {
            var stocksCollection = db.collection('stocks');
            if (!mongoError) {
              // get all the stock's symbols and names from the table
              stocksCollection.updateOne(
                { symbol: "AAPL" },
                { $push: {
                    prices: {
                        $each: [{
                            price: data.query.results.quote.LastTradePriceOnly, 
                            time: currentTime} 
                        ] 
                    } 
                }},
                function(err, results) {
                    //console.log(results);
                    db.close();
                });
            }
        });
    });

    //console.log("been 1 minutes");
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

    var queryOptions = {};
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
        mongoClient.connect(mongoUrl, function (mongoError, db) {

        var objectsCollection = db.collection('objects');
        if (!mongoError) {

            objectsCollection.find(findQueryObject).toArray(function (err, result) {
                // grab the objects from the table (include the values also if specified they're wanted in the query).
                var objectsArray = Array();
                for(var i = 0; i < result.length; i++) {
                    if(!includeObjectValues) {
                        objectsArray.push({name: result[i].name});
                    }
                    else {
                        objectsArray.push({name: result[i].name, values: result[i].values});
                    }
                }

                res.setHeader('Content-Type', 'application/json');
                res.send(JSON.stringify({objects: objectsArray}));
                db.close();
            });
        }
      });
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

    var queryOptions = {};
    var findQueryObject = {};

    var paramatersValid = false;

    // grab the "id" paramater from the GET request
    if (url_parts.query.hasOwnProperty("id")) {
        findQueryObject.id = url_parts.query.id;
        paramatersValid = true;
    }

    // grab the "predictor" paramater from the GET request
    if (url_parts.query.hasOwnProperty("predictor")) {
        findQueryObject.predictor = url_parts.query.predictor;

        if (url_parts.query.hasOwnProperty("count")) {
            queryOptions.limit = url_parts.query.count;
        }
        paramatersValid = true;
    }

    if (paramatersValid) {
        mongoClient.connect(mongoUrl, function (mongoError, db) {
            var predictionsCollection = db.collection('predictions');
            if (!mongoError) {
                // get all the stock's symbols and names from the table
                predictionsCollection.find(findQueryObject, queryOptions).toArray(function (err, result) {
                    // build the response object
                    var responseObject = {};
                    responseObject.predictions = result;
                    responseObject.status = "success";
                    responseObject.reason = "";
                    // send the response in JSON format
                    res.setHeader('Content-Type', 'application/json');
                    res.send(JSON.stringify(responseObject));
                    db.close();
                });
            }
            else {
                res.setHeader('Content-Type', 'application/json');
                res.send(JSON.stringify({ status: "failed", reason: "Error occured during database query." }));
            }
        });
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

    var queryOptions = {};
    var findQueryObject = {};

    var paramatersValid = false;

    // grab the "type" and "object" paramater from the GET request
    if (url_parts.query.hasOwnProperty("type") &&
        url_parts.query.hasOwnProperty("object")) {
        findQueryObject.type = url_parts.query.type;
        findQueryObject.object = url_parts.query.object;
        paramatersValid = true;
        // set the start time if "start" is a paramater in the GET request
        if (url_parts.query.hasOwnProperty("start")) {
            var startTime = url_parts.query.start;
            if (!findQueryObject.hasOwnProperty("values")) {
                findQueryObject.values = { $elemMatch: { time: {} } };
            }
            findQueryObject.values.$elemMatch.time.$gte = startTime;
        }
        // set the end time if "end" is a paramater in the GET request
        if (url_parts.query.hasOwnProperty("end")) {
            var endTime = url_parts.query.end;
            if (!findQueryObject.hasOwnProperty("values")) {
                findQueryObject.values = { $elemMatch: { time: {} } };
            }
            findQueryObject.values.$elemMatch.time.$lte = endTime;
        }
        // limit the result count if "count" is a paramater in the GET request
        if (url_parts.query.hasOwnProperty("count")) {
            queryOptions.limit = url_parts.query.count;
        }
    }

    if (paramatersValid) {
        mongoClient.connect(mongoUrl, function (mongoError, db) {
            var objectsCollection = db.collection('objects');
            if (!mongoError) {
                // get all the stock's symbols and names from the table
                objectsCollection.find(findQueryObject, queryOptions).toArray(function (err, result) {
                    // build the response object
                    var responseObject = {};
                    responseObject.values = result;
                    responseObject.status = "success";
                    responseObject.reason = "";
                    // send the response in JSON format
                    res.setHeader('Content-Type', 'application/json');
                    res.send(JSON.stringify(responseObject));
                    db.close();
                });
            }
            else {
                res.setHeader('Content-Type', 'application/json');
                res.send(JSON.stringify({ status: "failed", reason: "Error occured during database query." }));
            }
        });
    }

    else {
        res.setHeader('Content-Type', 'application/json');
        res.send(JSON.stringify({ status: "failed", reason: "Required paramaters are missing." }));
    }
});


/**
  * Insert a prediction into the predictions collection
  */
var insertPrediction = function (db, predictorId, createQuery) {
    var currentTime = Math.floor(milliseconds / 1000);
    db.collection('predictions').insertOne({
        predictor_id: predictorId,
        type: createQuery.type,
        object: createQuery.object,
        value: createQuery.value,
        action: createQuery.action,
        start: currentTime,
        end: createQuery.end
    }, function (err, result) {
        console.log("Inserted a prediction");
        console.log(result);
        db.close();
        res.setHeader('Content-Type', 'application/json');
        res.send(JSON.stringify({ status: "success", record: result }));
    });
};


/**
  * Insert a prediction into the predictions collection
  */
var insertPredictorThenPrediction = function (db, callback, createQuery) {
    var currentTime = Math.floor(milliseconds / 1000);
    db.collection('predictors').insertOne({
        predictor: createQuery.predictor
    }, function (err, result) {
        console.log("Inserted a predictor");
        console.log(result);
        callback(db, result._id, createQuery);
    });
};


/**
  * Receive prediction creation posts and insert them in the collection
  */
var createPredictionRouter = express.Router();
app.use('/createprediction', createPredictionRouter);
createPredictionRouter.use(function (req, res, next) {

    var url = require('url');
    var url_parts = url.parse(req.originalUrl, true);

    // Make sure all of the required fields are in the request body
    if(url_parts != null &&
        url_parts.query.hasOwnProperty("predictor") &&
        url_parts.query.hasOwnProperty("type") &&
        url_parts.query.hasOwnProperty("object") &&
        url_parts.query.hasOwnProperty("value") &&
        url_parts.query.hasOwnProperty("action") &&
        url_parts.query.hasOwnProperty("end")) {
        // insert the prediction
        mongoClient.connect(mongoUrl, function (mongoError, db) {
            var predictorCollection = db.collection('predictor');
            if (!mongoError) {
                // check to see if the predictor exists in the predictor collection
                predictorCollection.find({ predictor: url_parts.query.predictor }).toArray(function (err, result) {
                    // if the predictor exists, then insert prediction with the retreived predictor _id
                    if (result.length > 0) {
                        insertPrediction(
                            db,
                            result[0]._id,
                            url_parts.query);
                    }
                    // if the predictor doesn't exist, then insert the predictor and then insert the prediction
                    else {
                        insertPredictorThenPrediction(
                            db,
                            function (db, predictorId, requestBody) {
                                insertPrediction(db, predictorId, requestBody)
                            },
                            url_parts.query);
                    }
                });
            }

            else {
                res.setHeader('Content-Type', 'application/json');
                res.send(JSON.stringify({ status: "failed", reason: "Error occured during database query." }));
            }
        });
    }
    // some or all of the required fields were not present
    else {
        res.setHeader('Content-Type', 'application/json');
        res.send(JSON.stringify({ status: "failed", reason: "Required paramaters are missing." }));
    }
});

app.listen(3060);
