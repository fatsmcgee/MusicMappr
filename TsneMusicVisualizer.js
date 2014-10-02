
function TsneMusicVisualizer(pointCloudSvgNode){
	
	var self = this;
	this._tsne = new tsnejs.tSNE();
	var AudioContext = window.AudioContext || window.webkitAudioContext;
	this._audioContext = new AudioContext();
	
	//initialize the point cloud visualizer's visual settings
	this._pointCloud = new PointCloudVisualizer(pointCloudSvgNode);
	
	//music chunks later in the song are colored lighter
	this._pointCloud.setColoringFunction(function(p,chunkIdx,numChunks){
		var greyVal = (chunkIdx/numChunks)*230; 
		return d3.rgb(greyVal,greyVal,greyVal);
	});
	
	this._pointCloud.setMouseoverPointFunction(function(p,chunkIdx,numChunks){
		var offset = chunkIdx * self._chunkDuration;
		self._playSound(offset);
	});
	
	//following variables unitialized until music is loaded
	this._musicBuffer = null;
	this._chunkLength = null;
	this._chunkDuration = null;
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

			
TsneMusicVisualizer.prototype.loadMusicFromUrl = function(musicUrl){
	musicUrl = musicUrl;
	
	var request = new XMLHttpRequest();
	
	request.open('GET', musicUrl,true);
	request.responseType = 'arraybuffer';
	
	var self = this;
	request.onload = function(){
		self._loadMusicFromBuffer(request.response);
	}
	
	request.send();
}

TsneMusicVisualizer.prototype.loadMusicFromFileNode = function(fileNode){
	var files = d3.select(fileNode).node().files;
	if (!files.length) {
	  alert('Please select a file!');
	  return;
	}

	var file = files[0];

	var reader = new FileReader();

	var self = this;
	reader.onloadend = function(evt) {
	  if (evt.target.readyState == FileReader.DONE) { // DONE == 2
		self._loadMusicFromBuffer(reader.result);
		
	  }
	};
	reader.readAsArrayBuffer(file);
}

TsneMusicVisualizer.prototype._loadMusicFromBuffer = function(arrayBuffer){

	var self = this;
	this._audioContext.decodeAudioData(arrayBuffer, function(audioBuffer){
		self._musicBuffer = audioBuffer;
		self._chunkLength = 16384;
		self._chunkDuration = self._chunkLength/audioBuffer.sampleRate;

		self._getDataFromMusicBufferAsync(function(spectogramData){
			self._tsne.initDataRaw(spectogramData);
			self.stepAndDraw();
		});
		
	},function(e){alert('error' + e)});
}

//continuation(dataArray) should be a function that takes dataArray, an array of feature arrays,
//and performs some action on them when ready
TsneMusicVisualizer.prototype._getDataFromMusicBufferAsync = function(continuation){
	
	var chunkLength = this._chunkLength;
	var bufferData = this._musicBuffer.getChannelData(0);
	//console.log("Buffer length is " + bufferData.length);
	var nChunks = Math.floor(bufferData.length/chunkLength);
	//console.log("Number of samples is " + nChunks);
	
	
	var datas = new Array(nChunks);
	var processedChunks = 0;
	
	var numWorkers = 4;
	var fftWorkers = [];
	
	function onWorkerMessage(evt){

		var output = evt.data;
		datas[output.chunkNo] = output.features;  
		if(++processedChunks == nChunks){
			blah = datas;
			continuation(datas);
			
		}
	}
	
	for(var i = 0; i<numWorkers; i++){
		fftWorkers.push(new Worker('feature_extraction_worker.js'));
		fftWorkers[i].onmessage = onWorkerMessage;
	}
	
	//raw sample data to be passed into webworker
	var samples = new Float32Array(chunkLength);
	
	for(var i = 0; i<nChunks; i++){
	
		for(var j = 0; j<chunkLength; j++){
			samples[j] = bufferData[chunkLength*i+j];
		}
		
		var worker = fftWorkers[i%numWorkers];
		worker.postMessage({chunkNo:i, samples:samples, chunkDuration:this._chunkDuration});
	}
}

TsneMusicVisualizer.prototype.step = function(steps){
	var steps = steps || 1;
	for(var i = 0; i<steps; i++){
		this._tsne.step();
	}
	var newPoints = this._tsne.getSolution();
	this._pointCloud.update(newPoints);
}

TsneMusicVisualizer.prototype.draw = function(){
	this._pointCloud.draw();
}

TsneMusicVisualizer.prototype.stepAndDraw = function(){
	this.step();
	this.draw();
}

TsneMusicVisualizer.prototype.animate = function(){
	requestAnimationFrame(this.animate.bind(this));
	this.stepAndDraw(1);
}





