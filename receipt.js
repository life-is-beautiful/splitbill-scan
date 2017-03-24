
var vision = require('@google-cloud/vision')({
    projectId: 'valiant-xxxxx-126820',  // replace with your project Id
    credentials: require('./My Project-googlecredential.json') // replace this with yours
  });

var storage = require('@google-cloud/storage')({
    projectId: 'valiant-xxxxx-126820',  // replace with your project Id
    credentials: require('./My Project-googlecredential.json') // replace this with yours
  });


var threshold = 10; // threshold for y coordinate (line) just in case image is skewed. 
                    // this is used for identifying each block of text are in the same line.
var thresholdXPct = 20; // threshold for x coordinate - just in case the result is a skewed box

module.exports = {
  analyze: function(bucket, img, callback){
    console.log("detecting image: ",img);
    console.log("image bucket location: ", bucket);
  
    // detecing text in image inside the bucket 
    vision.detectText(storage.bucket(bucket).file(img), {
      verbose:true
    },function(err, res) {
      // if error found during processing
      if (res == undefined) {
        console.log(err);
        console.log(err.errors[0].errors);
        callback({'error': 'Error processing file'});
        return;
      }

      console.log("Start Detection...");
      var line = -1;
      var sentences = [];
      var sentencesBounds = [];
      var s = "";
      var endx = 0, endXMin, endXMax, startx = 0, startxcount = 0, startXMax;

      // 1. define farthest right x coordinate
      for(var i in res){
        if(i == 0) continue;
        var bounds = res[i].bounds;
        endx = Math.max(endx,Math.max(res[i].bounds[1].x,res[i].bounds[3].x)); // get the farthest right x coordinate
      }
      
      endXMin = endx - thresholdXPct*endx/100; // calculate threshold for x

      // 2. construct sentence line by line.
      var lastbounds;
      for(var i in res){
        if(i == 0) continue;
        var bounds = res[i].bounds;
        var thisavg = (bounds[2].y+bounds[3].y)/2;
        if(line < 0) line = thisavg;

        // check if the middle of the 'word' is within the line threshold
        if(Math.abs(thisavg - line) <= threshold){  
          s += " "+res[i].desc; // within the threshold, add to line with 'space delimited'
        } 
        else{ // beyond threshold
          var avgendx = (lastbounds[1].x+lastbounds[3].x)/2;
        
          if(avgendx >= endXMin){ // assume a new line, pushing the old sentence to the list.
            sentences.push(s); 
            sentencesBounds.push(bounds);
          }
          s = res[i].desc; // create new line
          startx += bounds[0].x;
          startxcount++;
        }
        line = thisavg;
        lastbounds = bounds;
      } 
      
      startx /= startxcount;
      startXMax = startx+thresholdXPct*startx/100;
      var result = [];
      
      // 3. getting the 'last price' - from the rightest part of sentence and traverse to the left.
      for(var j in sentences){
        var sr = sentences[j].split(" ");
        console.log("--> setence is ",sentences[j]);
        console.log("---->sr is ",sr);

        
        var numCandidate = "";
        var checkBefore = true;

        // going from right to left
        for (var iBack= sr.length; iBack--; iBack <=0 ) {
          var word = sr[iBack].trim();
          
          // google vision 'cuts' word by space (?), so sometime we see the amount 2, 000 is cut into 
          // 2 words, need to join this into a number.
          if (word.startsWith(',') || word.startsWith('.')) {  
            word = word.replace(/,/g,"");
            var num = Number(word);
            if (!num) {
              console.log('------>stop at word: '+word);
              break; // end -- not an umber;
            } else {
              numCandidate = word+numCandidate;
              console.log('------> numCandidate is: ', numCandidate);
              checkBefore = true;
              continue;
            }

          } else if (word.endsWith(',') || word.endsWith('.')) {
              word = word.replace(/,/g,"");
              var num = Number(word);
              if (!num) {
                console.log('------>stop at word: '+word);
                break; // end -- not an umber;
              } else {
                numCandidate = word+numCandidate;
                console.log('------> numCandidate is: ', numCandidate);
                checkBefore = false;
                continue;
              }
          } else if (checkBefore) {
              word = word.replace(/,/g,"");
              var num = Number(word);
              if (!num) {
                console.log('------>stop at word: '+word);
                break; // end -- not an umber;
              } else {
                numCandidate = word+numCandidate;
                console.log('------> numCandidate is: ', numCandidate);
                checkBefore = false;
                continue;
              }
          } else {
            console.log('------>stop at word: '+word);
            break;
          }
         
        }

        console.log("------>candidate is ",numCandidate);

        // 4. construct the result. return is list of number and bounds (last word bounds).
        // bounds are needed to 'highlight' the part in the UI
        var num = Number(numCandidate);
        if(!num || num < 100){
          if(result.length == 0 || num < 100)continue;
        }  else {
          result.push ( 
            { 'number': Number(numCandidate),
              'bounds': sentencesBounds[j]
            }
          );
        }
      }

      result = { 'textDetectionResult': result };

      console.log("result ",JSON.stringify(result));
      console.log("End Detection...");
      callback(result);
      
  });
  }
}