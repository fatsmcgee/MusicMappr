function SongAmplitudeVisualizer(songSvgNode){
	this._svgNode = d3.select(songSvgNode);
	this._highlightIdx = null;
}

SongAmplitudeVisualizer.prototype.update = function(amplitudes){
	this._amplitudes = amplitudes;
}


//returns function which takes a given index in the amplitudes, and returns its x position on the bar chart
SongAmplitudeVisualizer.prototype._getIndexScaler = function(){
	return d3.scale.linear().domain([0, this._amplitudes.length]).range([0,this._svgNode.attr("width")]);
}

SongAmplitudeVisualizer.prototype.render = function(){

	var self = this;
	
	var amplitudes = this._amplitudes;
	var nAmplitudes = amplitudes.length;
	
	var width = this._svgNode.attr("width");
	var height = this._svgNode.attr("height");
	
	rects = this._svgNode.selectAll("rect .chunks");
	if(amplitudes.length != rects.size()){
		rects
			.data(amplitudes)
			.enter()
			.append("rect")
			.attr("class","chunk");
	}
	
	//Scale the points to their extent
	var maxAmplitude = d3.max(amplitudes);
	var minAmplitude = d3.min(amplitudes);
	
	//Give a margin of 10 from the top and the right
	var scaleAmplitude = d3.scale.linear().domain([minAmplitude, maxAmplitude]).range([0,height-10]);
	var scaleIndex = this._getIndexScaler(); 
	
	this._svgNode.selectAll("rect.chunk")
		.data(amplitudes)
		.attr("x",function(amplitude,i){ return scaleIndex(i);}) 
		.attr("y", function(amplitude){return height - scaleAmplitude(amplitude);}) 
		.attr("width", function(amplitude){
			return scaleIndex(1); //width is full length of a bucket minus margin of 1
		})
		.attr("height", function(amplitude){
			return scaleAmplitude(amplitude);
		})
		.style("fill",function(amplitude,i){return self._coloringFunction(i,nAmplitudes);})
		.on("mouseover.plugin",function(amplitude,i){
			self._mouseoverPointFunction(i,nAmplitudes);
		})
		.on("mouseover.highlight",function(amplitude,i){
			self.highlightIdx(i);
			if(self._highlightedCallback){
				self._highlightedCallback(i);
			}
		});
		
}

SongAmplitudeVisualizer.prototype._removeHighlight = function(){
	var prevHighlight = this._svgNode.select("rect.highlight._" + this._highlightIdx);
	if(prevHighlight.size()){
		prevHighlight.remove();
		this._deHighlightedCallback && this._deHighlightedCallback(this._highlightIdx);
	}
}


SongAmplitudeVisualizer.prototype.deHighlightIdx = function(idx){
	this._svgNode.select("rect.highlight._" + idx).remove();
}

SongAmplitudeVisualizer.prototype.highlightIdx = function(idx){
	
	var self = this;
	
	this._removeHighlight();
	this._highlightIdx = idx;
	
	var idxToX = this._getIndexScaler();
	var width = idxToX(1);
	this._svgNode.append("rect")
	.attr("class","highlight _" + idx)
	.attr("x",idxToX(idx))
	.attr("y",0)
	.attr("height", this._svgNode.attr("height"))
	.attr("width",width)
	.attr("fill",d3.rgb(255,0,0))
	.attr("fill-opacity",.5)
	.on("mouseout.highlight",function(){
			self.deHighlightIdx(idx);
			self._deHighlightedCallback && self._deHighlightedCallback(idx);
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


