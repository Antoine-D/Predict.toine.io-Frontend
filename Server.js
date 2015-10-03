var express = require("express");
var app     = express();
var bodyParser = require("body-parser");
var path = require("path");


var mongodb = require('mongodb');
var mongoClient = mongodb.MongoClient;
var mongoUrl = 'mongodb://localhost:27017/pennapps';

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

/* Api Router */
var getStepsRouter = express.Router();

getStepsRouter.use(function (req, res, next) {
    res.json("asked for steps");
    return;
});

// static files
//app.use("/css", express.static(__dirname + '/css'));
app.use("/js", express.static(__dirname + '/js'));
app.use("/assets", express.static(__dirname + '/assets'));

// Registering the routers
app.use('/steps/', getStepsRouter);

// Handle http posts
app.post('/post_step', function(req, res) {
    res.json("Just posted ");

    mongoClient.connect(mongoUrl, function (mongoError, db) {

        var date = new Date();

        if (!mongoError) {
            db.collection("steps").insertOne({
                "date" : getCurrentDateTime(),
                "steps" : 3
            });

            console.log("Inseted steps into db");
        }

        else {
            db.close();
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
