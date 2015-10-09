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

app.get('/app',function(req,res) {
    res.sendFile(path.join(__dirname+"/app.html"));
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

/** 
  * Stocks info endpoint for getting name and symbol for all stocks in the table
  */
var stocksInfoRouter = express.Router();
app.use('/stocksinfo', stocksInfoRouter);
stocksInfoRouter.use(function (req, res, next) {
  mongoClient.connect(mongoUrl, function (mongoError, db) {
    var stocksCollection = db.collection('stocks');
    if (!mongoError) {
      // get all the stock's symbols and names from the table
      stocksCollection.find().toArray(function (err, result) {
        // stocks info array (just name and symbol)
        var stocksInfoArray = Array();
        for(var i = 0; i < result.length; i++) {
            stocksInfoArray.push({name: result[i].name, symbol: result[i].symbol});
        }
        res.setHeader('Content-Type', 'application/json');
        res.send(JSON.stringify(stocksInfoArray));
        db.close();
      });
    }
  });
});

/**
  * Stocks price history endpoint, get all recorded prices for a specified stock between 
  * two specified times (epoch format)
  */
var stockPriceHistoryRouter = express.Router();
app.use('/stockpricehistory', stockPriceHistoryRouter);
stockPriceHistoryRouter.use(function (req, res, next) {

    var url = require('url');
    var url_parts = url.parse(req.originalUrl, true);

    var findQueryObject = {};

    // specify the symbol in the query
    if (url_parts.query.hasOwnProperty("symbol")) {
        findQueryObject.symbol = url_parts.query.symbol;
    }

    // create the time greater than condition (if an start time is specified)
    if (url_parts.query.hasOwnProperty("start")) {
        var startTime = parseInt(url_parts.query.start);
        // create the prices conditional object if it doesn't exist
        if(!findQueryObject.hasOwnProperty("prices")) {
            findQueryObject.prices = { $elemMatch: {time: {}}};
        }
        // time of price must be gte to the startTime
        findQueryObject.prices.$elemMatch.time.$gte = startTime;
    }

    // create the time less than condition (if an end time is specified)
    if (url_parts.query.hasOwnProperty("end")) {
        var endTime = parseInt(url_parts.query.end);
        // create the prices conditional object if it doesn't exist
        if (!findQueryObject.hasOwnProperty("prices")) {
            findQueryObject.prices = { $elemMatch: { time: {} } };
        }
        // time of price must be gte to the startTime
        findQueryObject.prices.$elemMatch.time.$lte = endTime;
    }

    console.log(findQueryObject);
    // if the symbol was provided, the grab the prices according to times paramaters
    if (findQueryObject.hasOwnProperty("symbol") && typeof findQueryObject.symbol != "undefined") {
        mongoClient.connect(mongoUrl, function (mongoError, db) {
            var stocksCollection = db.collection('stocks');
            if (!mongoError) {
                // get all the stock's symbols and names from the table
                stocksCollection.find().toArray(function (err, result) {
                    res.setHeader('Content-Type', 'application/json');
                    res.send(JSON.stringify(result));
                    db.close();
                });
            }
        });
    }
});

/**
  * Makes sure the string only consists of alphanumerical characters and spaces
  */
var isAlphanumericalPlusSpaces = function(stringToCheck) {
    for (var i = 0; i < stringToCheck.length; i++) {
        if ((stringToCheck[i] >= 'a' && stringToCheck[i] <= 'z') ||
            (stringToCheck[i] >= 'A' && stringToCheck[i] <= 'Z') ||
            (stringToCheck[i] >= '0' && stringToCheck[i] <= '9') ||
            (stringToCheck[i].charCodeAt(0) == 32)) {
            continue;
        }
        else { // it's not a (lower/upper) character, digit, or space
            return false;
        }
    }
    // reached here --> so is valid alphanumeric plus spaces
    return true;
}

/**
  * Hash function
  */
var hash = function (stringToHash) {
    var resultString = "";
    for (var i = 0; i < stringToHash.length; i++) {
        var randomNumberRanges = [[42, 47], [58, 64], [91, 99]]
        if (stringToHash[i] == " ") {
            var randomNumberRangeIndex = Math.floor(Math.random() * 3);
            var randomNumberRange = randomNumberRanges[randomNumberRangeIndex];
            var rangeDifference = randomNumberRange[1] - randomNumberRange[0];
            var resultInteger = Math.floor(Math.random() * (rangeDifference + 1)) + randomNumberRange[0];
            resultString += resultInteger.toString(16);
        }
        else {
            var charCode = stringToHash.charCodeAt(i);
            // if character is a lowercase letter, then add 5 to the charCode and mod it with 100
            if ((stringToHash[i] < '0' || stringToHash[i] > '9') && stringToHash[i].toLowerCase() == stringToHash[i]) {
                charCode = (charCode + 19) % 100;
            }
            resultString += charCode.toString(16);
        }
    }

    // convert the integer string to hex string
    //resultString = parseInt(resultString).toString(16);

    return resultString;
}

/**
  * Un-Hash function
  */
var unhash = function (hashedString) {
    // convert the hex string to decimal string
    //hashedString = parseInt(hashedString, 16).toString();


    var resultString = "";
    for (var i = 0; i < hashedString.length - 1; i+=2) {
        var thisCharCode = parseInt(hashedString[i] + hashedString[i + 1], 16);
        var thisCharacter;
        if ((thisCharCode >= 42 && thisCharCode <= 47) ||
            (thisCharCode >= 58 && thisCharCode <= 64) ||
            (thisCharCode >= 91 && thisCharCode <= 99)) {
            thisCharacter = " ";
        }
        else {
            if (thisCharCode >= 16 && thisCharCode <= 41) {
                thisCharacter = String.fromCharCode((thisCharCode + 100) - 19);
            }
            else {
                thisCharacter = String.fromCharCode(thisCharCode);
            }
        }

        resultString += thisCharacter;
    }

    return resultString;
}

/**
  * Owner's predictions page url endpoint. Used to get the url of the owner's prediction page 
  * given the owner's string.
  */
var usersPredictionsPageUrlRouter = express.Router();
app.use('/creatorpageurl', usersPredictionsPageUrlRouter);
usersPredictionsPageUrlRouter.use(function (req, res, next) {
    var url = require('url');
    var url_parts = url.parse(req.originalUrl, true);

    // specify the symbol in the query
    if (url_parts.query.hasOwnProperty("creator") && typeof url_parts.query.creator != "undefined") {
        var creator = url_parts.query.creator;
        var hashedOwnerString = hash(creator);

        res.setHeader('Content-Type', 'application/json');
        res.send(JSON.stringify({creator: hashedOwnerString}));
    }

    else {
        res.setHeader('Content-Type', 'application/json');
        res.send(JSON.stringify("Unprovided paramaters: creator"));
    }
});

/**
  * User's prediction's endpoint (get all predictions assosiated with that user)
  * responds with json of all the user's predictions
  */
var preditionsDataRouter = express.Router();
app.use('/getpredictions', preditionsDataRouter);
preditionsDataRouter.use(function (req, res, next) {
    var url = require('url');
    var url_parts = url.parse(req.originalUrl, true);

    // specify the symbol in the query
    if (url_parts.query.hasOwnProperty("creator") && typeof url_parts.query.creator != "undefined") {
        var hashedCreatorString = url_parts.query.creator;
        var creatorString = unhash(hashedCreatorString);

        //console.log("Unhashed: " + creatorString);
        mongoClient.connect(mongoUrl, function (mongoError, db) {

            if(!mongoError) {
                // get all the stock's symbols and names from the table
                db.collection('predictions').find({ creator: creatorString }).toArray(function (err, result) {
                    res.setHeader('Content-Type', 'application/json');
                    res.send(JSON.stringify(result));
                    db.close();
                });
            }
        });
    }

    else
    {
        res.setHeader('Content-Type', 'application/json');
        res.send(JSON.stringify("Unprovided paramaters: creator"));
    }
});


/**
  * Insert a prediction into the predictions collection
  */
var insertPrediction = function (db, requestBody, callback) {
    db.collection('predictions').insertOne({
        "creator": requestBody["creator"],
        "type": requestBody["type"],
        "object": requestBody["object"],
        "metric": requestBody["metric"],
        "action": requestBody["action"],
        "start": requestBody["start"],
        "end": requestBody["end"]

    }, function (err, result) {
        assert.equal(err, null);
        console.log("Inserted a prediction");
        callback(result);
    });
};


/**
  * Receive prediction creation posts and insert them in the collection
  */
app.post('/createprediction', function (req, res) {
    // Make sure all of the required fields are in the request body and the 
    // creator string consists only of alphanumerics and spaces, and that 
    // the creator string length is less than 1000 characters.
    if (req.body != null
        && "creator" in req.body
        && isAlphanumericalPlusSpaces(req.body)
        && req.body["creator"].length < 1000
        && "type" in req.body
        && "start" in req.body
        && "end" in req.body
        && "object" in req.body
        && "metric" in req.body
        && "action" in req.body) {

        // insert the prediction
        mongoClient.connect(mongoUrl, function (mongoError, db) {
            assert.equal(null, mongoError);
            insertPrediction(db, req.body, function () {
                db.close();
            });
        });
    }
    // some or all of the required fields were not present
    else {
        console.log("Missing things from the post request.");
    }
});

function getCurrentDateTime() {
    var date = new Date();

    var year = date.getFullYear();

    var monthNumber = date.getMonth();
    monthNumber++;
    if(monthNumber < 10) {
        monthNumber = "0" + monthNumber;
    }

    var dayNumber = date.getDate();
    if(dayNumber < 10) {
        dayNumber = "0" + dayNumber;
    }

    var hourNumber = date.getHours();
    if(hourNumber < 10) {
        hourNumber = "0" + hourNumber;
    }

    var minuteNumber = date.getMinutes();
    if(minuteNumber < 10) {
        minuteNumber = "0" + minuteNumber;
    }

    var secondNumber = date.getSeconds();
    if(secondNumber < 10) {
        secondNumber = "0" + secondNumber;
    }

    return year + "-" + monthNumber + 
        "-" + dayNumber + " " + hourNumber + ":" + 
        minuteNumber + ":" + secondNumber;
}

app.listen(3060);
