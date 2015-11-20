var monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

/**
  * Creates a human readable time from the date dateToGetTimeOf
  */
var getHumanReadableTime = function(dateToGetTimeOf) {
    var hours = dateToGetTimeOf.getHours();
    var minutes = dateToGetTimeOf.getMinutes();
    var minutesString = (minutes < 10) ? "0" : "";
    minutesString += minutes.toString();
    var hoursString = ((hours % 12) > 0) ? (hours % 12).toString() : "12";
    var timePostfix = (hours < 12) ? "am" : "pm";
    return hoursString + ":" + minutesString + timePostfix;
}

/**
  * Gets the most recent price of a stock and calls with the optional callback
  */
var getMostRecentPrice = function(symbol, callback) {
  var nowTime = parseInt((new Date).getTime() / 1000);
  var oneHourAgoTime = nowTime - (60 * 60);
  // create the endpoint GET url with params
  var stockPricesEndpoint = "http://predict.toine.io/values?type=stock";
  stockPricesEndpoint += "&object=";
  stockPricesEndpoint += encodeURIComponent(String(symbol).trim());
  stockPricesEndpoint += "&start=";
  stockPricesEndpoint += encodeURIComponent(String(oneHourAgoTime).trim());
  stockPricesEndpoint += "&end=";
  stockPricesEndpoint += encodeURIComponent(String(nowTime).trim());
  // create the request result handler
  var xmlhttp = new XMLHttpRequest();
  xmlhttp.open("GET", stockPricesEndpoint, true);
  xmlhttp.onreadystatechange=function() {
    // if the status is correct, attempt to parse the response as an object
    if(xmlhttp.readyState==4 && xmlhttp.status==200) {
        var rawstockPriceHistory = xmlhttp.responseText;
        var stockPriceHistory = JSON.parse(rawstockPriceHistory);
        stockPriceHistory.sort(compareValueObjects); // make most recent value first
        // if the value exists and the html input element exists to place it in
        if(stockPriceHistory.length > 0 && 
          stockPriceHistory[0].hasOwnProperty("value") && 
          stockPriceHistory[0].value != null) {
          if(typeof(callback) == "function") {
            callback(stockPriceHistory[0].value);
          }
        }
    }
  }

  xmlhttp.send();
};

/**
  * Compare two value objects
  */
var compareValueObjects = function(a,b) {
  if (a.time < b.time)
    return -1;
  if (a.time > b.time)
    return 1;
  return 0;
}

/** 
  * populate the price history chart with an entire month or year 
  * (if monthIndex == null then assumes you want entire year)
  */
var populatePriceHistoryGraphHistorical = function (symbol, startDateTime, endDateTime) {
  // clear the graph
  $('#price-history-chart').highcharts({});
  // triger loading status on UI (shows loading text and disabled time interval buttons)
  startLoading(); 

  // create the endpoint GET url with params
  var historicalEndpoint = "http://predict.toine.io/values?queryType=historical&type=stock";
  historicalEndpoint += "&object=";
  historicalEndpoint += encodeURIComponent(String(symbol).trim());
  historicalEndpoint += "&start=";
  historicalEndpoint += encodeURIComponent(String(startDateTime).trim());
  historicalEndpoint += "&end=";
  historicalEndpoint += encodeURIComponent(String(endDateTime).trim());
  console.log(historicalEndpoint);
  // create the request result handler
  var xmlhttp = new XMLHttpRequest();
  xmlhttp.open("GET", historicalEndpoint, true);
  xmlhttp.onreadystatechange=function() {
    // if the status is correct, attempt to parse the response as an object
    if(xmlhttp.readyState==4 && xmlhttp.status==200) {
        var rawstockPriceHistory = xmlhttp.responseText;
        var historicalValues = JSON.parse(rawstockPriceHistory);
        // sort the resulting value objects
        historicalValues.sort(compareValueObjects);
        
        var dates = Array();
        var lows = Array();
        var highs = Array();
        var opens = Array();
        var closes = Array();
        //var volumes = Array();
        for (var i = 0; i < historicalValues.length; i++) {
          console.log(historicalValues[i]);
          var thisDay = historicalValues[i].day;
          var thisMonth = historicalValues[i].month;
          var thisYear = historicalValues[i].year;
          var thisDate = thisMonth.toString() + "/" + thisDay.toString() + "/" + thisYear.toString();
          dates.push(thisDate);

          lows.push(parseFloat(historicalValues[i].low));
          highs.push(parseFloat(historicalValues[i].high));
          opens.push(parseFloat(historicalValues[i].open));
          closes.push(parseFloat(historicalValues[i].close));
          //volumes.push(stockPriceHistory[i].volume);
        }
        // draw the graph using the times (x-axis) and prices (y-axis)
        drawHistoricalGraph(symbol, dates, lows, highs, opens, closes);
        endLoading(); // after drawing the price graph -> end the loading
    }
  }

  xmlhttp.send();
}

/**
  * Return the price history between [startDateTime, endDateTime]
  */
var populatePriceHistoryGraphTimeInterval = function (symbol, startDateTime, endDateTime) {
  // clear the graph
  $('#price-history-chart').highcharts({});
  
  startLoading(); // triger loading status on UI (shows loading text and disabled time interval buttons)

  // create the endpoint GET url with params
  var stockPricesEndpoint = "http://predict.toine.io/values?type=stock";
  stockPricesEndpoint += "&object=";
  stockPricesEndpoint += encodeURIComponent(String(symbol).trim());
  stockPricesEndpoint += "&start=";
  stockPricesEndpoint += encodeURIComponent(String(startDateTime).trim());
  stockPricesEndpoint += "&end=";
  stockPricesEndpoint += encodeURIComponent(String(endDateTime).trim());
  // create the request result handler
  var xmlhttp = new XMLHttpRequest();
  xmlhttp.open("GET", stockPricesEndpoint, true);
  xmlhttp.onreadystatechange=function() {
    // if the status is correct, attempt to parse the response as an object
    if(xmlhttp.readyState==4 && xmlhttp.status==200) {
        var rawstockPriceHistory = xmlhttp.responseText;
        var stockPriceHistory = JSON.parse(rawstockPriceHistory);
        stockPriceHistory.sort(compareValueObjects);
        // create seperate lists for prices and dates
        var prices = Array();
        var times = Array(); // epoch times
        for (var i = 0; i < stockPriceHistory.length; i++) {
            // add the price to the prices array
            prices.push(parseFloat(stockPriceHistory[i].value));
            // get the time the price was recorded and add it to the time list
            var priceDate = new Date(0);
            priceDate.setSeconds(stockPriceHistory[i].time);
            var priceTimeString = getHumanReadableTime(priceDate);
            /*var priceHour = (priceDate.getHours() + 1)%24;
            var priceMinute = priceDate.getMinutes();
            var timeSeperator = (priceMinute >= 10) ? ":" : ":0"; // pad with 0 if minute less than 10*/
            var priceMonth = priceDate.getMonth() + 1;
            var priceDay = priceDate.getDate();
            times.push(priceMonth.toString() + "/" + priceDay.toString() + 
              " " + priceTimeString);
        }
        // draw the graph using the times (x-axis) and prices (y-axis)
        drawPriceGraph(symbol, times, prices);
        endLoading(); // after drawing the price graph -> end the loading
    }
  }

  xmlhttp.send();
};

/**
  * Show loading text and disable the time interval switch options
  */
var startLoading = function () {
    /* Show the loading text */
    if ($("#chart-loading-text").length > 0) {
        $("#chart-loading-text")[0].css("display", "block");
    }
    else {
        var loadingText = $("<h2></h2>");
        $(loadingText).attr("id", "chart-loading-text");
        $(loadingText).css("color", "#53B981");
        $(loadingText).html("Loading...");
        $("#price-history-chart").html(loadingText);
    }

    /* Disable all time interval buttons */
    $(".chart-time-interval-button").each(function () {
        $(this).prop("disabled", true);
    });
};

/**
  * End the loading sequence (hide loading text and re-enable the time interval buttons
  */
var endLoading = function () {
    /* Hide the loading text */
    while($("#chart-loading-text").length == 1) {
      $("#chart-loading-text")[0].css("display", "none");
    }

    /* Re-enable all the time interval buttons */
    $(".chart-time-interval-button").each(function () {
        $(this).prop("disabled", false);
    });
};

var drawPriceGraph = function (symbol, times, prices) {
  // populate the chart
  $('#price-history-chart').highcharts({
      chart: {
          zoomType: 'xy'
      },
      colors: ['#FF6600'],
      title: {
          text: ''
      },
      subtitle: {
          text: ''
      },
      exporting: {
          enabled: false
      },
      xAxis: [{
          categories: times,
          crosshair: true,
          title: {
              text: '<br/>Date and Time (EST)',
              style: {
                  color: '#333A45'
              }
          },
          labels: {
              enabled: false
          }
      }],
      yAxis: [{
          min: Math.min.apply(Math, prices),
          gridLineWidth: 0,
          title: {
              text: 'USD ($)',
              style: {
                  color: '#333A45'
              }
          },
          labels: {
              format: '{value}',
              style: {
                  color: '#333A45'
              }
          }
      }],
      legend: {
          shared: true,
          enabled: true
      },
      series: [{
          name: 'Price',
          yAxis: 0,
          data: prices,
          tooltip: {
              valuePrefix: '$'
          }
      }]
  });

  // clear highcharts graph footer
  $($('body').find("text")[$('body').find("text").length - 1]).html("");  
};

var drawHistoricalGraph = function (symbol, dates, lows, highs, opens, closes) {
  // populate the chart
  $('#price-history-chart').highcharts({
      chart: {
          zoomType: 'xy'
      },
      colors: ['#d9534f', '#5cb85c', '#5bc0de', '#337ab7'],
      title: {
          text: ''
      },
      subtitle: {
          text: ''
      },
      exporting: {
          enabled: false
      },
      xAxis: [{
          categories: dates,
          crosshair: true,
          title: {
              text: '<br/>Date',
              style: {
                  color: '#333A45'
              }
          },
          labels: {
              enabled: false
          }
      }],
      yAxis: [{
          min: Math.min.apply(Math, lows.concat(highs,opens, closes)),
          gridLineWidth: 0,
          title: {
              text: 'USD ($)',
              style: {
                  color: '#333A45'
              }
          },
          labels: {
              format: '{value}',
              style: {
                  color: '#333A45'
              }
          }
      }],
      legend: {
          shared: true,
          enabled: true
      },
      series: [{
          name: 'Low',
          yAxis: 0,
          data: lows,
          tooltip: {
              valuePrefix: '$'
          }
      }, {
          name: 'High',
          yAxis: 0,
          data: highs,
          tooltip: {
              valuePrefix: '$'
          }
      }, {
          name: 'Open',
          yAxis: 0,
          data: opens,
          tooltip: {
              valuePrefix: '$'
          }
      }, {
          name: 'Close',
          yAxis: 0,
          data: closes,
          tooltip: {
              valuePrefix: '$'
          }
      }]
  });

  // clear highcharts graph footer
  $($('body').find("text")[$('body').find("text").length - 1]).html("");  
};
