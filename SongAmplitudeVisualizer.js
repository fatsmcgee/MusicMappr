function SongAmplitudeVisualizer(songSvgNode, nBuckets){
	this._svgNode = d3.select(songSvgNode);
	this._amplitudeHighlightIdx = null;
	
	//default number of buckets = 200
	this._defaultBuckets = nBuckets || 100;
}

SongAmplitudeVisualizer.prototype.update = function(amplitudes){

	this._nBuckets = this._defaultBuckets;
	
	this._amplitudes = amplitudes;
	//number of buckets cannot be greater than number of amplitudes provided
	if(this._amplitudes.length <= this._nBuckets){
		this._nBuckets = this._amplitudes.length;
	}
	
	this._buckets = [];
	var amplitudesPerBucket = amplitudes.length/this._nBuckets;
	
	for(var i = 0; i<this._nBuckets; i++){
		//sum the total amplitude for this bucket. d3 will normalize so we don't need to
		var bucketAmplitude = 0;
		for(var j = ~~(i*amplitudesPerBucket); j<~~((i+1)*amplitudesPerBucket); j++){
			bucketAmplitude += this._amplitudes[j];
		}
		this._buckets[i] = bucketAmplitude;
	}
}

SongAmplitudeVisualizer.prototype._bucketFromAmplitudeIndex = function(idx){
	var nAmplitudes = this._amplitudes.length;
	return ~~((idx/nAmplitudes)*this._nBuckets);
}

//returns function which takes a given index in the buckets, and returns its x position on the bar chart
SongAmplitudeVisualizer.prototype._getIndexScaler = function(numIndices){
	return d3.scale.linear().domain([0, numIndices]).range([0,this._svgNode.attr("width")]);
}

//given x position in the SVG node, returns the corresponding amplitude index
SongAmplitudeVisualizer.prototype._getAmplitudeIdxFromX = function(x){
	var width = this._svgNode.attr("width");
	var scale =  d3.scale.linear().domain([0, width]).range([0,this._amplitudes.length]);
	return ~~scale(x);
}

SongAmplitudeVisualizer.prototype.render = function(){

	var self = this;
	
	var amplitudes = this._amplitudes;
	var nAmplitudes = amplitudes.length;
	var nBuckets = this._nBuckets;
	var buckets = this._buckets;
	
	var width = this._svgNode.attr("width");
	var height = this._svgNode.attr("height");
	
	rects = this._svgNode.selectAll("rect .chunks");
	if(nBuckets != rects.size()){
		rects
			.data(buckets)
			.enter()
			.append("rect")
			.attr("class","chunk");
	}
	
	//Scale the points to their extent
	var maxBucket = d3.max(buckets);
	var minBucket = d3.min(buckets);
	
	//Give a margin of 10 from the top and the right
	var scaleAmplitude = d3.scale.linear().domain([minBucket, maxBucket]).range([0,height-10]);
	var scaleIndex = this._getIndexScaler(nBuckets); 
	
	this._svgNode.selectAll("rect.chunk")
		.data(buckets)
		.attr("x",function(bucket,i){ return scaleIndex(i);}) 
		.attr("y", function(bucket){return height - scaleAmplitude(bucket);}) 
		.attr("width", function(bucket){
			return scaleIndex(1); //width is full length of a bucket minus margin of 1
		})
		.attr("height", function(bucket){
			return scaleAmplitude(bucket);
		})
		.style("fill",function(bucket,i){return self._coloringFunction(i,nBuckets);})
		.on("mousemove.plugin",function(bucket,i){
			var mouseX = d3.mouse(self._svgNode.node())[0];
			var amplitudeIdx =  self._getAmplitudeIdxFromX(mouseX);
			self._mouseoverPointFunction(amplitudeIdx,nAmplitudes);
		})
		.on("mousemove.highlight",function(bucket,bucketIdx){
			var mouseX = d3.mouse(self._svgNode.node())[0];
			var amplitudeIdx =  self._getAmplitudeIdxFromX(mouseX);
			self.highlightIdx(amplitudeIdx,mouseX);
			if(self._highlightedCallback){
				self._highlightedCallback(amplitudeIdx);
			}
		});
		
}

SongAmplitudeVisualizer.prototype._removeHighlight = function(){
	var prevHighlight = this._svgNode.select("rect.highlight._" + this._amplitudeHighlightIdx);
	if(prevHighlight.size()){
		prevHighlight.remove();
		this._deHighlightedCallback && this._deHighlightedCallback(this._amplitudeHighlightIdx);
	}
}


SongAmplitudeVisualizer.prototype.deHighlightIdx = function(idx){
	this._svgNode.select("rect.highlight._" + idx).remove();
}

//highlight the specified amplitudeIdx. If x is not given calculates x
SongAmplitudeVisualizer.prototype.highlightIdx = function(amplitudeIdx,x){
	
	var self = this;
	
	this._removeHighlight();
	this._amplitudeHighlightIdx = amplitudeIdx;
	
	var nAmplitudes = this._amplitudes.length;
	var idxToX = this._getIndexScaler(nAmplitudes);
	var x = x || idxToX(amplitudeIdx);
	console.log(x);
	
	var svgWidth = this._svgNode.attr("width");
	var width = ~~(svgWidth/nAmplitudes);
	
	this._svgNode.append("rect")
	.attr("class","highlight _" + amplitudeIdx)
	.attr("x",x)
	.attr("y",0)
	.attr("height", this._svgNode.attr("height"))
	.attr("width",width)
	.attr("fill",d3.rgb(255,0,0))
	.attr("fill-opacity",.5)
	.on("mouseout.highlight",function(){
			self.deHighlightIdx(amplitudeIdx);
			self._deHighlightedCallback && self._deHighlightedCallback(amplitudeIdx);
	});
}



//coloringFunction( idx, numAmplitudes): a function that returns a CSS color given an amplitude, its index in the amplitude array, and the number of amplitudes in the amplitude array
SongAmplitudeVisualizer.prototype.setColoringFunction = function(coloringFunction){
	this._coloringFunction = coloringFunction;
}

//mosueoverPointFunction( idx, numAmplitudes): a function which performs a mouseover action on a amplitude given the amplitude, its index 
//in the amplitude array, and the number of amplitudes in the point array
SongAmplitudeVisualizer.prototype.setMouseoverPointFunction = function(mouseoverPointFunction){
	this._mouseoverPointFunction = mouseoverPointFunction;
}

SongAmplitudeVisualizer.prototype.setHighlightedCallback = function(highlightedCallback){
	this._highlightedCallback = highlightedCallback;
}

SongAmplitudeVisualizer.prototype.setDeHighlightedCallback = function(deHighlightedCallback){
	this._deHighlightedCallback = deHighlightedCallback;
}


