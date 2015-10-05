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

schedule.scheduleJob('01 * * * * *', function() {
    var YQL = require('yql');
    var queryString = "select * from yahoo.finance.quote where symbol in ('MSFT') "
    var queryYQL = new YQL(queryString);

    queryYQL.exec(function(err, data) {
        console.log(data.query.results);
    });

    console.log("been 1 minutes");
});

// Static files
app.use("/assets", express.static(__dirname + '/assets'));

/** 
  * Stocks info endpoint for getting name and symbol for all stocks in the table
  */
var stocksInfoRouter = express.Router();
app.use('/stocksinfo/', stocksInfoRouter);
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
var stockPriceHistoryRouter = expressRouter();
app.use('/stockpricehistory/', stockPriceHistoryRouter);
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
