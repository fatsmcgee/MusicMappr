
function TsneMusicVisualizer(pointCloudSvgNode,songVisualizerSvgNode,audioNode){
	this._tsne = new tsnejs.tSNE();
	var AudioContext = window.AudioContext || window.webkitAudioContext;
	this._audioContext = new AudioContext();
	this._stopAnimatingSwitch = false;
	
	this._convergenceCheckInterval = 50;
	this._convergenceEpsilon = .02;
	
	//initialize the point cloud
	this.initializePointCloud(pointCloudSvgNode);
	this.initializeSongAmplitudeVisualizer(songVisualizerSvgNode);
	this._audioNode = d3.select(audioNode).node();
	
	var self = this;
	this._audioNode.onplay = function(){
		
		function timeout(lastIdx){
			
			if(lastIdx){
				self._pointCloud.deHighlightIdx(lastIdx);
				self._songAmplitudeViz.deHighlightIdx(lastIdx);
			}
			
			if(self._audioNode.paused){
				return;
			}
			
			var currentTime = self._audioNode.currentTime;
			var chunkIdx = ~~(currentTime/self._chunkDuration);
			self._pointCloud.highlightIdx(chunkIdx);
			self._songAmplitudeViz.highlightIdx(chunkIdx);
			setTimeout(timeout.bind(self,chunkIdx),self._chunkDuration*1000);
		}
		
		timeout();
	}
	
	
	//following variables unitialized until music is loaded
	this._musicBuffer = null;
	this._chunkLength = null;
	this._chunkDuration = null;
	
	//unitialized until TSNE is loaded
	this._lastCost = null;
	this._costDiffs = null;
	
	//does nothing until explicity set elsewhere
	this._loggerCallback = function(msg){};
	
	//initialize work ID so that song loading can be overridden
	this._workId = 0;
	
}

//Takes a function(string), where a string is a messaged to be logged from TsneMusicVisualizer
TsneMusicVisualizer.prototype.setLoggerCallback = function(logger){
	this._loggerCallback = logger;
}

TsneMusicVisualizer.prototype._getMaxIntArray = function(n){
	return d3.range(n).map(
		function(i){return Number.MAX_VALUE;}
		);
}

TsneMusicVisualizer.prototype.initializeSongAmplitudeVisualizer = function(songVisualizerSvgNode){
	var self = this;
	//initialize the sound amplitude visualizer settings
	this._songAmplitudeViz = new SongAmplitudeVisualizer(songVisualizerSvgNode);
	//for now, use same mouseover and coloring behavior as point cloud
	this._songAmplitudeViz.setColoringFunction(this._chunkColoringFunction);
	this._songAmplitudeViz.setMouseoverPointFunction(this._chunkMouseoverFunction.bind(this));
	this._songAmplitudeViz.setHighlightedCallback(function(i){
		self._pointCloud.highlightIdx(i);
	});
	this._songAmplitudeViz.setDeHighlightedCallback(function(i){
		self._pointCloud.deHighlightIdx(i);
	});
}

TsneMusicVisualizer.prototype.initializePointCloud = function(pointCloudSvgNode){
	var self = this;
	
	this._pointCloud = new PointCloudVisualizer(pointCloudSvgNode);
	
	//music chunks later in the song are colored lighter
	this._pointCloud.setColoringFunction(this._chunkColoringFunction);
	this._pointCloud.setMouseoverPointFunction(this._chunkMouseoverFunction.bind(this));
	//when point cloud has a chunk highlighted, song amplitude visualizer should also highlight it
	this._pointCloud.setHighlightedCallback(function(i){
		self._songAmplitudeViz.highlightIdx(i);
	});
	this._pointCloud.setDeHighlightedCallback(function(i){
		self._songAmplitudeViz.deHighlightIdx(i);
	});
	
	var playThroughClusterStopTrigger = {};

	this._pointCloud.setToggleClusterCallback(function(clusterIdx,clusterIndices){
		playThroughClusterStopTrigger[clusterIdx] = false;
		function timeout(i,lastIdx){
			self._pointCloud.deHighlightIdx(lastIdx);
			self._songAmplitudeViz.deHighlightIdx(lastIdx);
			
			if(playThroughClusterStopTrigger[clusterIdx] === true){
				return;
			}
			var chunkIdx = clusterIndices[i];
			var offset = chunkIdx * self._chunkDuration;
			self._playSound(offset);
			
			self._pointCloud.highlightIdx(chunkIdx);
			self._songAmplitudeViz.highlightIdx(chunkIdx);
			
			//play the next available chunk
			i = (i+1) % clusterIndices.length;
			setTimeout(timeout.bind(self,i,chunkIdx),self._chunkDuration*1000);
		}
		
		timeout(0);
	});
	
	this._pointCloud.setDeToggleClusterCallback(function(clusterIdx){
		playThroughClusterStopTrigger[clusterIdx] = true;
	});
}

TsneMusicVisualizer.prototype._chunkColoringFunction = function(chunkIdx,numChunks){
	var greyVal = (chunkIdx/numChunks)*230; 
	return d3.rgb(greyVal,greyVal,greyVal);
}

TsneMusicVisualizer.prototype._chunkMouseoverFunction  = function(chunkIdx,numChunks){
	var offset = chunkIdx * this._chunkDuration;
	this._playSound(offset);
}

TsneMusicVisualizer.prototype._playSound = function(offset){
	var source = this._audioContext.createBufferSource();
	source.buffer = this._musicBuffer;
	source.connect(this._audioContext.destination);

	source.start(0,offset);
	soundPlaying = true;
	setTimeout(function(){source.stop(0);},this._chunkDuration*1000);
	//source.stop(duration);
}

			
TsneMusicVisualizer.prototype.loadMusicFromUrl = function(musicUrl,onFinish){
	
	this._loggerCallback("Loading song from URL " + musicUrl + "...");
	
	request = new XMLHttpRequest();
	
	request.open('GET', musicUrl,true);
	request.responseType = 'arraybuffer';
	
	var self = this;
	request.onload = function(){
	
		self._loggerCallback("Song loaded.");
		self._loadMusicFromBuffer(request.response,onFinish);
		self._audioNode.src = musicUrl;
	}
	
	request.send();
}

TsneMusicVisualizer.prototype.loadMusicFromFileNode = function(fileNode,onFinish){
	var files = fileNode.node().files;
	if (!files.length) {
	  alert('Please select a file!');
	  return;
	}

	file = files[0];

	var reader = new FileReader();
	
	this._loggerCallback("Loading song from file " + file.name) + "...";

	var self = this;
	reader.onloadend = function(evt) {
		self._loggerCallback("File loaded");
	  if (evt.target.readyState == FileReader.DONE) { // DONE == 2
		self._loadMusicFromBuffer(reader.result,onFinish);
		
		var createObjectUrl = webkitURL.createObjectURL || Url.createObjectURL;
		var blob = new Blob([reader.result], {type: "audio/mpeg"});
		url = createObjectUrl(blob);
		self._audioNode.src = url;
	  }
	};
	reader.readAsArrayBuffer(file);
}

TsneMusicVisualizer.prototype._getNChunks = function(){
	return Math.floor(this._bufferData.length/this._chunkLength);
}

TsneMusicVisualizer.prototype._updateSongVisualizer = function(){
	//now get the chunk amplitudes to feed into the song visualizer
	var chunkAvgAmplitudes = new Float32Array(this._getNChunks());
	bufferData = this._bufferData; //tight loop optimizations, avoid member lookup
	var chunkLength = this._chunkLength;
	
	for(var i = 0,idx=0; i< bufferData.length; i+= chunkLength,idx++){
		var chunkTotal = 0;
		
		for (var j = i; j<i+chunkLength; j++){
			var sample = bufferData[j];
			chunkTotal += sample || 0;
		}
		chunkAvgAmplitudes[idx] = chunkTotal;
	}
	
	this._songAmplitudeViz.update(chunkAvgAmplitudes);
	this._songAmplitudeViz.render();
}

TsneMusicVisualizer.prototype._initTsne = function(featureData){
	this._tsne.initDataRaw(featureData);
	this._lastCost = Number.MAX_VALUE;
	this._costDiffs = this._getMaxIntArray(50);
	this._lastSolutions = [];
	this._stepNo = 0;
}

//Return a sample length that is a power of two fraction of the actual beat length
TsneMusicVisualizer.prototype._getSampleLengthFromBpm = function(sampleRate,bpm,maxChunkSize){
	var bps = bpm/60;
	var samplesPerBeat = sampleRate/bps;
	//use either beats or half beats or quarter beats etc...
	while(samplesPerBeat > maxChunkSize){
		samplesPerBeat/=2;
	}
	samplesPerBeat = ~~samplesPerBeat; 
	return samplesPerBeat;
}

TsneMusicVisualizer.prototype._loadMusicFromBuffer = function(arrayBuffer, onFinish){

	var self = this;
	
	var workId = ++self._workId;
	this._loggerCallback("Decoding audio data...");
	
	this._audioContext.decodeAudioData(arrayBuffer, function(audioBuffer){
	
		self._loggerCallback("Audio data decoded");
		
		self._musicBuffer = audioBuffer;
		
		var fftInputSize = 16384;
		

		self._chunkLength = fftInputSize;
<<<<<<< HEAD
		console.log("Not using bpm");
=======
>>>>>>> origin/master
		
		
		var fftPadding = fftInputSize - self._chunkLength;
		
		self._chunkDuration = self._chunkLength/audioBuffer.sampleRate;
		self._bufferData = audioBuffer.getChannelData(0);

		var start = new Date();
		
		self._loggerCallback("Extracting features from audio data...");
		self._getFeaturesFromMusicBufferAsync(workId,fftPadding,function(spectogramData){
			self._loggerCallback("Features extracted");
			var duration = ((new Date())-start)/1000;
			console.log("Features took " + duration + " seconds to compute");
			self._initTsne(spectogramData);
			self.stepAndDraw();
			
			if(workId == self._workId){
				onFinish && onFinish();
			}
		});
		
		self._updateSongVisualizer();
		
	},function(e){alert('error' + e)});
}

//continuation(dataArray) should be a function that takes dataArray, an array of feature arrays,
//and performs some action on them when ready
//TODO: instead of chunk padding, make into a more general feature extraction parameter object?
TsneMusicVisualizer.prototype._getFeaturesFromMusicBufferAsync = function(workId,fftPadding,continuation){
	
	var chunkLength = this._chunkLength;
	var bufferData = this._bufferData;
	var nChunks = Math.floor(bufferData.length/chunkLength);
	
	
	var datas = new Array(nChunks);
	var processedChunks = 0;
	
	var numWorkers = 4;
	var fftWorkers = [];
	
	var self = this;
	
	//event responding to a worker finishing its work and giving us output
	//when all chunks have been processed we're done
	function onWorkerMessage(evt){

		if(workId != self._workId){
			for(var i = 0; i<numWorkers; i++){
				fftWorkers[i].terminate();
			}
			return;
		}
		
		var output = evt.data;
		datas[output.chunkNo] = output.features;  
		if(++processedChunks == nChunks){
			continuation(datas);
			
		}
	}
	
	for(var i = 0; i<numWorkers; i++){
		fftWorkers.push(new Worker('feature_extraction_worker.js'));
		fftWorkers[i].onmessage = onWorkerMessage;
	}
	
	//raw sample data to be passed into webworker
	//Go up to actual chunk length, and make the rest zeros (need to pad to power of 2 for faster fft)
	var samples = new Float32Array(chunkLength+fftPadding);
	
	//the effective duration of the samples we pass to fft. Even though fftPadding of these samples are zero, still need to use the correct effective duration
	//to make sure right frequencies are selected
	var fftChunkDuration = (chunkLength+fftPadding)/this._musicBuffer.sampleRate;
	
	for(var i = 0; i<nChunks; i++){
	
		for(var j = 0; j<chunkLength; j++){
			samples[j] = bufferData[chunkLength*i+j];
		}
		
		var worker = fftWorkers[i%numWorkers];
		worker.postMessage({chunkNo:i, samples:samples, chunkDuration:fftChunkDuration});
	}
}

TsneMusicVisualizer.prototype._haveSolutionsConverged = function(oldPoints,newPoints){
	
	var oldXExtent = d3.extent(oldPoints, function(d){return d[0];});
	var oldYExtent = d3.extent(oldPoints, function(d){return d[1];});
	var newXExtent = d3.extent(newPoints, function(d){return d[0];});
	var newYExtent = d3.extent(newPoints, function(d){return d[1];});
	
	var scaleOldX = d3.scale.linear().domain([oldXExtent[0], oldXExtent[1]]).range([0,1]);
	var scaleOldY = d3.scale.linear().domain([oldYExtent[0], oldYExtent[1]]).range([0,1]);
	
	var scaleNewX = d3.scale.linear().domain([newXExtent[0], newXExtent[1]]).range([0,1]);
	var scaleNewY = d3.scale.linear().domain([newYExtent[0], newYExtent[1]]).range([0,1]);
	
	var scaledEuclideanDists = d3.range(oldPoints.length).map(function(i){
		var squaredDist = Math.pow(scaleNewY(newPoints[i][1])-scaleOldY(oldPoints[i][1]),2) + Math.pow(scaleNewX(newPoints[i][0])-scaleOldX(oldPoints[i][0]),2);
		return Math.sqrt(squaredDist);
	});
	
	var totalScaledEuclideanDist = d3.sum(scaledEuclideanDists);
	var avgScaledEuclideanDist = totalScaledEuclideanDist/oldPoints.length;
	console.log("Average scaled euclidean dist: " + avgScaledEuclideanDist);
	
	return avgScaledEuclideanDist < this._convergenceEpsilon;
}

TsneMusicVisualizer.prototype.step = function(steps){
	var steps = steps || 1;
	
	for(var i = 0; i<steps; i++){
		var cost = this._tsne.step();
	}
	
	var costDiff = cost-this._lastCost;
	this._lastCost = cost;
	
	var newPoints = this._tsne.getSolution();
	if(this._stepNo % this._convergenceCheckInterval ==0){
		if(this._lastSolutions.length == 2){
			this._lastSolutions.shift();
		}
		
		//tsne.getSolution() returns a reference, so we must clone
		var pointsClone = newPoints.map(function(pt){return [pt[0],pt[1]];});
		this._lastSolutions.push(pointsClone);
		
		if(this._stepNo >= this._convergenceCheckInterval){
			if(this._haveSolutionsConverged(this._lastSolutions[0], this._lastSolutions[1])){
				this.stopAnimate();
				console.log("Done animating");
			}
		}
	}
	
	this._pointCloud.update(newPoints);
	
	this._stepNo++;
	return Math.abs(costDiff);
}

TsneMusicVisualizer.prototype.draw = function(){
	this._pointCloud.draw();
}

TsneMusicVisualizer.prototype.stepAndDraw = function(){
	this.step();
	this.draw();
}


TsneMusicVisualizer.prototype.stopAnimate = function(){
	this._stopAnimatingSwitch = true;
}

TsneMusicVisualizer.prototype.animate = function(stopContinuation,notFirstIteration){

	if(!notFirstIteration){
		this._loggerCallback("Optimizing soundscape...");
	}
	
	this.stepAndDraw();
	if(this._stopAnimatingSwitch){
		this._loggerCallback("Soundscape optimized.");
		this._loggerCallback("Ready to go! Hold down keyboard keys A-Z to play through clusters. Hover over dots to play corresponding song sample. Hover over bars to play that part of the song.");
		this._loggerCallback("You can also load your own song from a file or URL.");
		this._stopAnimatingSwitch = false;
		stopContinuation && stopContinuation();
		return;
	}
	requestAnimationFrame(this.animate.bind(this,stopContinuation,true));
	
}

TsneMusicVisualizer.prototype.getKMeans = function(){
	this._pointCloud.getKMeans();
}





