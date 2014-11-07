var BeatDetector = {}

BeatDetector._getPeaksAtThreshold = function(data, threshold) {
  var peaksArray = [];
  var length = data.length;
  for(var i = 0; i < length;) {
    if (data[i] > threshold) {
      peaksArray.push(i);
      // Skip forward ~ 1/4s to get past this peak.
      i += 10000;
    }
    i++;
  }
  return peaksArray;
}

//function to get the index of the maximum value of all arrays of size k
//ie the local maximum for an array in all neighborhoods of size k
function kMax(arr,k)
{
	var largest = [];
    // Create a Double Ended Queue, Qi that will store indexes of array elements
    // The queue will store indexes of useful elements in every window and it will
    // maintain decreasing order of values from front to rear in Qi, i.e., 
    // arr[Qi.front[]] to arr[Qi.rear()] are sorted in decreasing order
	
	var Qi = d3.range(k).map(function(i){return 0;})
 
    /* Process first k (or first window) elements of array */
    for (var i = 0; i < k; ++i)
    {
        // For very element, the previous smaller elements are useless so
        // remove them from Qi
        while ( (Qi.length > 0) && arr[i] >= arr[Qi[0]])
            Qi.shift() // Remove from rear
 
        // Add new element at rear of queue
        Qi.unshift(i);
    }
 
	var n = arr.length;
    // Process rest of the elements, i.e., from arr[k] to arr[n-1]
    for ( ; i < n; ++i)
    {
        // The element at the front of the queue is the largest element of
        // previous window, so print it
        //cout << arr[Qi.front()] << " ";
		
		largest.push(Qi[Qi.length-1]);
 
        // Remove the elements which are out of this window
        while ( (Qi.length>0) && Qi[Qi.length-1] <= i - k)
            Qi.pop();  // Remove from front of queue
 
        // Remove all elements smaller than the currently
        // being added element (remove useless elements)
        while ( (Qi.length > 0) && arr[i] >= arr[Qi[0]])
            Qi.shift();
 
         // Add current element at the rear of Qi
        Qi.unshift(i);
    }
 
    // Print the maximum element of last window
    largest.push(Qi[Qi.length-1]);
	
	return largest;
}

BeatDetector._getPeaksPartition = function(data,minPartition,maxPartition, threshold) {

  //var windowSize = 500;
  //var maxSlidingIndices = kMax(data,minPartition);
  

  var peaksArray = [];
  
  /*var lastPeak = 0;
  for(var i = 0; i<maxSlidingIndices.length; i++){
		var nextPeak = maxSlidingIndices[i];
		if(nextPeak - lastPeak +1 >= minPartition){
			peaksArray.push(nextPeak);
			lastPeak = nextPeak + 1;
		}
  }*/
  
  var length = data.length;
  
  var lastPeak = 0;
  
  for(var i = minPartition; i < length;) {
  
	if( (i-lastPeak+1) >= maxPartition || i==length-1){
		peaksArray.push(i);
		lastPeak = i+1;
		i+= minPartition;
	}
	
    if (data[i] > threshold && (i-lastPeak+1) >= minPartition) {
		console.log("Threshold is " + threshold + " and sample is " + data[i]);
      peaksArray.push(i);
	  lastPeak = i+1;
      // Skip forward by the minimum partition length
      i += minPartition;
    }
	
    i++;
  }
  
  return peaksArray;
}


//buffer should be a music buffer
BeatDetector._getFilteredBufferAsync = function (buffer,filterType,frequency,continuation){

	var OfflineContext = window.OfflineAudioContext || window.webkitOfflineAudioContext;
	
	var offlineContext = new OfflineContext(1,buffer.length,buffer.sampleRate);
	
	// Create buffer source
	var source = offlineContext.createBufferSource();
	source.buffer = buffer;

	// Create filter
	var filter = offlineContext.createBiquadFilter();
	//low pass: frequencies below this are taken... high pass: frequencies above this are taken
	filter.frequency.value = frequency;
	
	if(filterType === "lowpass"){
		filter.type = "lowpass";
		
	}
	else if(filterType === "highpass"){
		filter.type = "highpass";
		filter.Q.value = 2; //TODO: I HAVE NO IDEA IF THIS IS NECCESARY
	}
	else{
		alert("Filter type not supported!");
	}
	

	// Pipe the song into the filter, and the filter into the offline context
	source.connect(filter);
	filter.connect(offlineContext.destination);

	// Schedule the song to start playing at time:0
	source.start(0);

	// Render the song
	offlineContext.startRendering();

	// Act on the result
	offlineContext.oncomplete = function(e) {
	  // Filtered buffer!
	  var filteredBuffer = e.renderedBuffer;
	  continuation(filteredBuffer);
	}
}

function countIntervalsBetweenNearbyPeaks(peaks) {
  var intervalCounts = [];
  peaks.forEach(function(peak, index) {
    for(var i = 0; i < 10; i++) {
      var interval = peaks[index + i] - peak;
      var foundInterval = intervalCounts.some(function(intervalCount) {
        if (intervalCount.interval === interval)
          return intervalCount.count++;
      });
      if (!foundInterval && (interval !==0) ) {
        intervalCounts.push({
          interval: interval,
          count: 1
        });
      }
    }
  });
  return intervalCounts;
}

function groupNeighborsByTempo(intervalCounts) {
  var tempoCounts = []
  intervalCounts.forEach(function(intervalCount, i) {
    // Convert an interval to tempo
    var theoreticalTempo = 60 / (intervalCount.interval / 44100 );

    // Adjust the tempo to fit within the 90-180 BPM range
    while (theoreticalTempo < 90) theoreticalTempo *= 2;
    while (theoreticalTempo > 180) theoreticalTempo /= 2;

    var foundTempo = tempoCounts.some(function(tempoCount) {
      if (tempoCount.tempo === theoreticalTempo)
        return tempoCount.count += intervalCount.count;
    });
    if (!foundTempo) {
      tempoCounts.push({
        tempo: theoreticalTempo,
        count: intervalCount.count
      });
    }
  });
  
  return tempoCounts;
}

function getBpm(musicBuffer){
	BeatDetector._getFilteredBufferAsync(musicBuffer,"highpass","2000",function(filteredBuffer){
		console.log("have filtered buffer");
		var rawData = filteredBuffer.getChannelData(0);
		peaks = BeatDetector._getPeaksAtThreshold(rawData, d3.max(rawData)*.7);
		console.log("have peaks");
		intervals = countIntervalsBetweenNearbyPeaks(peaks);
		console.log("have intervals");
		tempoCounts = groupNeighborsByTempo(intervals);
		console.log("have counts");
		console.log("done");
	});
}


function getPeaksPartition(musicBuffer){
	BeatDetector._getFilteredBufferAsync(musicBuffer,"highpass","2000",function(filteredBuffer){
		console.log("have filtered buffer");
		var rawData = filteredBuffer.getChannelData(0);
		
		var sort = radixsort();
		var copyRawData = new Float32Array(rawData);
		var sorted = sort(copyRawData);
		var threshold = d3.quantile(sorted,.95);
		
		partition = BeatDetector._getPeaksPartition(rawData, 8192, 16384, threshold);
		diffs = [];
		for(var i = 1; i<partition.length; i++){diffs.push(partition[i]-partition[i-1]);}
		
	});
}



