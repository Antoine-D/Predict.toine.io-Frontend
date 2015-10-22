var monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

/** 
  * populate the price history chart with an entire month or year 
  * (if monthIndex == null then assumes you want entire year)
  */
var populatePriceHistoryGraphMonthYear = function (monthIndex, year) {
    // clear the graph
    $('#price-history-chart').highcharts({});
}

/**
  * Return the price history between [startDateTime, endDateTime]
  */
var populatePriceHistoryGraphTimeInterval = function (symbol, startDateTime, endDateTime) {
  // clear the graph
  $('#price-history-chart').highcharts({});
  
  // create the endpoint GET url with params
  var stockPricesEndpoint = "http://104.131.219.239:3060/values?type=stock";
  stockPricesEndpoint += "&object=";
  stockPricesEndpoint += encodeURIComponent(String(symbol).trim());
  stockPricesEndpoint += "&start=";
  stockPricesEndpoint += encodeURIComponent(String(startDateTime).trim());
  stockPricesEndpoint += "&end=";
  stockPricesEndpoint += encodeURIComponent(String(endDateTime).trim());
  console.log(stockPricesEndpoint);
  // create the request result handler
  var xmlhttp = new XMLHttpRequest();
  xmlhttp.open("GET", stockPricesEndpoint, true);
  xmlhttp.onreadystatechange=function() {
    // if the status is correct, attempt to parse the response as an object
    if(xmlhttp.readyState==4 && xmlhttp.status==200) {
        var rawstockPriceHistory = xmlhttp.responseText;
        var stockPriceHistory = JSON.parse(rawstockPriceHistory);
        //console.log(stockPriceHistory);
        // create seperate lists for prices and dates
        var prices = Array();
        var times = Array(); // epoch times
        for (var i = 0; i < stockPriceHistory.length; i++) {
            // add the price to the prices array
            prices.push(parseFloat(stockPriceHistory[i].value));
            // get the time the price was recorded and add it to the time list
            var priceDate = new Date(0);
            priceDate.setSeconds(stockPriceHistory[i].time);
            var priceHour = (priceDate.getHours() + 1)%24;
            var priceMinute = priceDate.getMinutes();
            var priceMonth = priceDate.getMonth() + 1;
            var priceDay = priceDate.getDate();
            var timeSeperator = (priceMinute >= 10) ? ":" : ":0"; // pad with 0 if minute less than 10
            times.push(priceMonth.toString() + "/" + priceDay.toString() + 
              " " + priceHour.toString() + timeSeperator + priceMinute.toString());
        }
        // draw the graph using the times (x-axis) and prices (y-axis)
        drawPriceGraph(symbol, times, prices);
    }
  }

  xmlhttp.send();
};

var drawPriceGraph = function (symbol, times, prices) {
  // populate the chart
  $('#price-history-chart').highcharts({
      chart: {
          zoomType: 'xy'
      },
      colors: ['#53B981'],
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
              text: 'Price ($)',
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
          enabled: false
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
