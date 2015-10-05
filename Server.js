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

// the routers
var stocksInfoRouter = express.Router();

// Registering the routers
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
