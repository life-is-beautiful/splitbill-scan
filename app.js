// This application uses express as its web server
// for more info, see: http://expressjs.com
var express = require('express');

// create a new express server
var app = express();

// receipt scanning
var receipt = require('./receipt');

// testing: curl "http://localhost:6001/receipt?img=1484656960352struk1.jpg&bucket=mdenny-bucket123"
app.get('/receipt', function(req, res){
	// example filename in google storage. i.e.: 1484656960352struk1.jpg
  var img = req.query.img;
  // bucket name in google storage. 
  var bucket = req.query.bucket;
	receipt.analyze(bucket, img, function(result){
		res.json(result)
	});
});


// start server on the specified port and binding host
app.listen(6001, '0.0.0.0', function() {
  // print a message when the server starts listening
  console.log("server starting on localhost:6001");
});
