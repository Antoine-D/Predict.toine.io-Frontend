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

/**
  * Every 1 minuite, record the price of all of the stocks in the objects table 
  * (stocks have the type: "stock").
  */
schedule.scheduleJob('01 * * * * *', function() {
    mongoClient.connect(mongoUrl, function (mongoError, db) {
        if (!mongoError) {
            var objectsCollection = db.collection('objects');
            var YQL = require('yql');
            var symbols = ["MMM", "ABT", "ABBV", "ACN", "ACE", "ATVI", "ADBE", "ADT", "AAP", "AES", "AET", "AFL", "AMG", "A", "GAS", "APD", "ARG", "AKAM", "AA", "AGN", "ALXN", "ALLE", "ADS", "ALL", "GOOGL", "GOOG", "ALTR", "MO", "AMZN", "AEE", "AAL", "AEP", "AXP", "AIG", "AMT", "AMP", "ABC", "AME", "AMGN", "APH", "APC", "ADI", "AON", "APA", "AIV", "AAPL", "AMAT", "ADM", "AIZ", "T", "ADSK", "ADP", "AN", "AZO", "AVGO", "AVB", "AVY", "BHI", "BLL", "BAC", "BK", "BCR", "BXLT", "BAX", "BBT", "BDX", "BBBY", "BRK-B", "BBY", "BIIB", "BLK", "HRB", "BA", "BWA", "BXP", "BSX", "BMY", "BRCM", "BF-B", "CHRW", "CA", "CVC", "COG", "CAM", "CPB", "COF", "CAH", "HSIC", "KMX", "CCL", "CAT", "CBG", "CBS", "CELG", "CNP", "CTL", "CERN", "CF", "SCHW", "CHK", "CVX", "CMG", "CB", "CI", "XEC", "CINF", "CTAS", "CSCO", "C", "CTXS", "CLX", "CME", "CMS", "COH", "KO", "CCE", "CTSH", "CL", "CPGX", "CMCSA", "CMCSK", "CMA", "CSC", "CAG", "COP", "CNX", "ED", "STZ", "GLW", "COST", "CCI", "CSX", "CMI", "CVS", "DHI", "DHR", "DRI", "DVA", "DE", "DLPH", "DAL", "XRAY", "DVN", "DO", "DFS", "DISCA", "DISCK", "DG", "DLTR", "D", "DOV", "DOW", "DPS", "DTE", "DD", "DUK", "DNB", "ETFC", "EMN", "ETN", "EBAY", "ECL", "EIX", "EW", "EA", "EMC", "EMR", "ENDP", "ESV", "ETR", "EOG", "EQT", "EFX", "EQIX", "EQR", "ESS", "EL", "ES", "EXC", "EXPE", "EXPD", "ESRX", "XOM", "FFIV", "FB", "FAST", "FDX", "FIS", "FITB", "FSLR", "FE", "FISV", "FLIR", "FLS", "FLR", "FMC", "FTI", "F", "FOSL", "BEN", "FCX", "FTR", "GME", "GPS", "GRMN", "GD", "GE", "GGP", "GIS", "GM", "GPC", "GNW", "GILD", "GS", "GT", "GWW", "HAL", "HBI", "HOG", "HAR", "HRS", "HIG", "HAS", "HCA", "HCP", "HP", "HES", "HPQ", "HD", "HON", "HRL", "HST", "HCBK", "HUM", "HBAN", "ITW", "IR", "INTC", "ICE", "IBM", "IP", "IPG", "IFF", "INTU", "ISRG", "IVZ", "IRM", "JEC", "JBHT", "JNJ", "JCI", "JPM", "JNPR", "KSU", "K", "KEY", "GMCR", "KMB", "KIM", "KMI", "KLAC", "KSS", "KHC", "KR", "LB", "LLL", "LH", "LRCX", "LM", "LEG", "LEN", "LVLT", "LUK", "LLY", "LNC", "LLTC", "LMT", "L", "LOW", "LYB", "MTB", "MAC", "M", "MNK", "MRO", "MPC", "MAR", "MMC", "MLM", "MAS", "MA", "MAT", "MKC", "MCD", "MHFI", "MCK", "MJN", "WRK", "MDT", "MRK", "MET", "KORS", "MCHP", "MU", "MSFT", "MHK", "TAP", "MDLZ", "MON", "MNST", "MCO", "MS", "MOS", "MSI", "MUR", "MYL", "NDAQ", "NOV", "NAVI", "NTAP", "NFLX", "NWL", "NFX", "NEM", "NWSA", "NWS", "NEE", "NLSN", "NKE", "NI", "NBL", "JWN", "NSC", "NTRS", "NOC", "NRG", "NUE", "NVDA", "ORLY", "OXY", "OMC", "OKE", "ORCL", "OI", "PCAR", "PH", "PDCO", "PAYX", "PYPL", "PNR", "PBCT", "POM", "PEP", "PKI", "PRGO", "PFE", "PCG", "PM", "PSX", "PNW", "PXD", "PBI", "PCL", "PNC", "RL", "PPG", "PPL", "PX", "PCP", "PCLN", "PFG", "PG", "PGR", "PLD", "PRU", "PEG", "PSA", "PHM", "PVH", "QRVO", "PWR", "QCOM", "DGX", "RRC", "RTN", "O", "RHT", "REGN", "RF", "RSG", "RAI", "RHI", "ROK", "COL", "ROP", "ROST", "RCL", "R", "CRM", "SNDK", "SCG", "SLB", "SNI", "STX", "SEE", "SRE", "SHW", "SIAL", "SIG", "SPG", "SWKS", "SLG", "SJM", "SNA", "SO", "LUV", "SWN", "SE", "STJ", "SWK", "SPLS", "SBUX", "HOT", "STT", "SRCL", "SYK", "STI", "SYMC", "SYY", "TROW", "TGT", "TEL", "TE", "TGNA", "THC", "TDC", "TSO", "TXN", "TXT", "HSY", "TRV", "TMO", "TIF", "TWX", "TWC", "TJX", "TMK", "TSS", "TSCO", "RIG", "TRIP", "FOXA", "FOX", "TSN", "TYC", "USB", "UA", "UNP", "UAL", "UNH", "UPS", "URI", "UTX", "UHS", "UNM", "URBN", "VFC", "VLO", "VAR", "VTR", "VRSN", "VRSK", "VZ", "VRTX", "VIAB", "V", "VNO", "VMC", "WMT", "WBA", "DIS", "WM", "WAT", "ANTM", "WFC", "HCN", "WDC", "WU", "WY", "WHR", "WFM", "WMB", "WEC", "WYN", "WYNN", "XEL", "XRX", "XLNX", "XL", "XYL", "YHOO", "YUM", "ZBH", "ZION", "ZTS"];
            for(var queryIndex = 0; queryIndex <= Math.floor((symbols.length-1)/20); queryIndex++) {
            //for(var queryIndex = 0; queryIndex <= 0; queryIndex++) {
                var thisQueriesSymbols = Array();
                for(var symbolIndex = queryIndex*20; 
                    (symbolIndex < (queryIndex+1)*20) && (symbolIndex < symbols.length); 
                    symbolIndex++) {
                    thisQueriesSymbols.push(symbols[symbolIndex]);
                }

                var queryString = "select * from yahoo.finance.quote where symbol in ('" + thisQueriesSymbols.join("','") + "') ";

                var queryYQL = new YQL(queryString);

                queryYQL.exec(function(err, data) {
                    for(var resultIndex = 0; resultIndex < data.query.results.quote.length; resultIndex++) {
                        var thisQuote = data.query.results.quote[resultIndex];
                        var currentTime = Math.floor((new Date).getTime() / 60000)*60;
                        console.log(thisQuote);

                        objectsCollection.updateOne(
                            { object:  thisQuote.symbol},
                            { $push: {
                                values: {
                                    $each: [{
                                        value: thisQuote.LastTradePriceOnly, 
                                        time: currentTime} 
                                    ] 
                                } 
                            }},
                            function(err, results) {});
                    }
                });
            }
        }
    });
});

/**
  * Create the tables for the S&P
  */
/*var initialRouter = express.Router();
app.use('/init', initialRouter);
initialRouter.use(function (req, res, next) {
    mongoClient.connect(mongoUrl, function (mongoError, db) {
        var objectsCollection = db.collection('objects');
        if (!mongoError) {
            var YQL = require('yql');
            var symbols = ["MMM", "ABT", "ABBV", "ACN", "ACE", "ATVI", "ADBE", "ADT", "AAP", "AES", "AET", "AFL", "AMG", "A", "GAS", "APD", "ARG", "AKAM", "AA", "AGN", "ALXN", "ALLE", "ADS", "ALL", "GOOGL", "GOOG", "ALTR", "MO", "AMZN", "AEE", "AAL", "AEP", "AXP", "AIG", "AMT", "AMP", "ABC", "AME", "AMGN", "APH", "APC", "ADI", "AON", "APA", "AIV", "AAPL", "AMAT", "ADM", "AIZ", "T", "ADSK", "ADP", "AN", "AZO", "AVGO", "AVB", "AVY", "BHI", "BLL", "BAC", "BK", "BCR", "BXLT", "BAX", "BBT", "BDX", "BBBY", "BRK-B", "BBY", "BIIB", "BLK", "HRB", "BA", "BWA", "BXP", "BSX", "BMY", "BRCM", "BF-B", "CHRW", "CA", "CVC", "COG", "CAM", "CPB", "COF", "CAH", "HSIC", "KMX", "CCL", "CAT", "CBG", "CBS", "CELG", "CNP", "CTL", "CERN", "CF", "SCHW", "CHK", "CVX", "CMG", "CB", "CI", "XEC", "CINF", "CTAS", "CSCO", "C", "CTXS", "CLX", "CME", "CMS", "COH", "KO", "CCE", "CTSH", "CL", "CPGX", "CMCSA", "CMCSK", "CMA", "CSC", "CAG", "COP", "CNX", "ED", "STZ", "GLW", "COST", "CCI", "CSX", "CMI", "CVS", "DHI", "DHR", "DRI", "DVA", "DE", "DLPH", "DAL", "XRAY", "DVN", "DO", "DFS", "DISCA", "DISCK", "DG", "DLTR", "D", "DOV", "DOW", "DPS", "DTE", "DD", "DUK", "DNB", "ETFC", "EMN", "ETN", "EBAY", "ECL", "EIX", "EW", "EA", "EMC", "EMR", "ENDP", "ESV", "ETR", "EOG", "EQT", "EFX", "EQIX", "EQR", "ESS", "EL", "ES", "EXC", "EXPE", "EXPD", "ESRX", "XOM", "FFIV", "FB", "FAST", "FDX", "FIS", "FITB", "FSLR", "FE", "FISV", "FLIR", "FLS", "FLR", "FMC", "FTI", "F", "FOSL", "BEN", "FCX", "FTR", "GME", "GPS", "GRMN", "GD", "GE", "GGP", "GIS", "GM", "GPC", "GNW", "GILD", "GS", "GT", "GWW", "HAL", "HBI", "HOG", "HAR", "HRS", "HIG", "HAS", "HCA", "HCP", "HP", "HES", "HPQ", "HD", "HON", "HRL", "HST", "HCBK", "HUM", "HBAN", "ITW", "IR", "INTC", "ICE", "IBM", "IP", "IPG", "IFF", "INTU", "ISRG", "IVZ", "IRM", "JEC", "JBHT", "JNJ", "JCI", "JPM", "JNPR", "KSU", "K", "KEY", "GMCR", "KMB", "KIM", "KMI", "KLAC", "KSS", "KHC", "KR", "LB", "LLL", "LH", "LRCX", "LM", "LEG", "LEN", "LVLT", "LUK", "LLY", "LNC", "LLTC", "LMT", "L", "LOW", "LYB", "MTB", "MAC", "M", "MNK", "MRO", "MPC", "MAR", "MMC", "MLM", "MAS", "MA", "MAT", "MKC", "MCD", "MHFI", "MCK", "MJN", "WRK", "MDT", "MRK", "MET", "KORS", "MCHP", "MU", "MSFT", "MHK", "TAP", "MDLZ", "MON", "MNST", "MCO", "MS", "MOS", "MSI", "MUR", "MYL", "NDAQ", "NOV", "NAVI", "NTAP", "NFLX", "NWL", "NFX", "NEM", "NWSA", "NWS", "NEE", "NLSN", "NKE", "NI", "NBL", "JWN", "NSC", "NTRS", "NOC", "NRG", "NUE", "NVDA", "ORLY", "OXY", "OMC", "OKE", "ORCL", "OI", "PCAR", "PH", "PDCO", "PAYX", "PYPL", "PNR", "PBCT", "POM", "PEP", "PKI", "PRGO", "PFE", "PCG", "PM", "PSX", "PNW", "PXD", "PBI", "PCL", "PNC", "RL", "PPG", "PPL", "PX", "PCP", "PCLN", "PFG", "PG", "PGR", "PLD", "PRU", "PEG", "PSA", "PHM", "PVH", "QRVO", "PWR", "QCOM", "DGX", "RRC", "RTN", "O", "RHT", "REGN", "RF", "RSG", "RAI", "RHI", "ROK", "COL", "ROP", "ROST", "RCL", "R", "CRM", "SNDK", "SCG", "SLB", "SNI", "STX", "SEE", "SRE", "SHW", "SIAL", "SIG", "SPG", "SWKS", "SLG", "SJM", "SNA", "SO", "LUV", "SWN", "SE", "STJ", "SWK", "SPLS", "SBUX", "HOT", "STT", "SRCL", "SYK", "STI", "SYMC", "SYY", "TROW", "TGT", "TEL", "TE", "TGNA", "THC", "TDC", "TSO", "TXN", "TXT", "HSY", "TRV", "TMO", "TIF", "TWX", "TWC", "TJX", "TMK", "TSS", "TSCO", "RIG", "TRIP", "FOXA", "FOX", "TSN", "TYC", "USB", "UA", "UNP", "UAL", "UNH", "UPS", "URI", "UTX", "UHS", "UNM", "URBN", "VFC", "VLO", "VAR", "VTR", "VRSN", "VRSK", "VZ", "VRTX", "VIAB", "V", "VNO", "VMC", "WMT", "WBA", "DIS", "WM", "WAT", "ANTM", "WFC", "HCN", "WDC", "WU", "WY", "WHR", "WFM", "WMB", "WEC", "WYN", "WYNN", "XEL", "XRX", "XLNX", "XL", "XYL", "YHOO", "YUM", "ZBH", "ZION", "ZTS"];
            for(var i = 0; i < symbols.length; i++) {
                var queryString = "select * from yahoo.finance.quote where symbol in ('" + symbols[i] + "') ";
                var queryYQL = new YQL(queryString);

                queryYQL.exec(function(err, data) {
                    objectsCollection.insertOne({
                        object: data.query.results.quote.Symbol,
                        company: data.query.results.quote.Name,
                        type: "stock",
                        values: []
                    }, function (err, result) {});
                    //console.log(data.query.results.quote.Name);
                    //console.log(data.query.results.quote.Name);
                });
            }
        }
    });
});*/

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
        mongoClient.connect(mongoUrl, function (mongoError, db) {

        var objectsCollection = db.collection('objects');
        if (!mongoError) {
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
        mongoClient.connect(mongoUrl, function (mongoError, db) {
            var predictionsCollection = db.collection('predictions');
            if (!mongoError) {
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
        mongoClient.connect(mongoUrl, function (mongoError, db) {
            var objectsCollection = db.collection('objects');
            if (!mongoError) {
                // get all the stock's symbols and names from the table
                objectsCollection.aggregate(aggregateArray).toArray(function (err, result) {
                    res.setHeader('Content-Type', 'application/json');
                    res.send(JSON.stringify(result));
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
var insertPrediction = function (res, db, predictorId, predictionCreateObject) {
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
        db.close();
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
var insertPredictorThenPrediction = function (res, db, callback, predictionCreateObject) {
    db.collection('predictors').insertOne({
        predictor: predictionCreateObject.predictor
    }, function (err, result) {
        callback(res, db, result.ops[0]._id, predictionCreateObject);
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
        mongoClient.connect(mongoUrl, function (mongoError, db) {
            var predictorCollection = db.collection('predictors');
            if (!mongoError) {
                // check to see if the predictor exists in the predictor collection
                predictorCollection.find({ predictor: predictionCreateObject.predictor }).toArray(function (err, result) {
                    // if the predictor exists, then insert prediction with the retreived predictor _id
                    if (result.length > 0) {
                        insertPrediction(
                            res,
                            db,
                            result[0]._id,
                            predictionCreateObject);
                    }
                    // if the predictor doesn't exist, then insert the predictor and then insert the prediction
                    else {
                        insertPredictorThenPrediction(
                            res,
                            db,
                            function (res, db, predictorId, predictionObject) {
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
        });
    }
    // some or all of the required fields were not present
    else {
        res.setHeader('Content-Type', 'application/json');
        res.send(JSON.stringify({ status: "failed", reason: "Required paramaters are missing." }));
    }
});

app.listen(3060);
