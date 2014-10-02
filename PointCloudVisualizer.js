

function PointCloudVisualizer(svgNode){
	this._svgNode = d3.select(svgNode);
}

//points: an array of 2-element arrays, where the first element = the x coordinate and the second element = the y coordinate
PointCloudVisualizer.prototype.update = function(points){
	this._points = points;
}

PointCloudVisualizer.prototype.updateAndDraw = function(points){
	this.update(points);
	this.draw();
}

PointCloudVisualizer.prototype.draw = function(){
	
	var self = this;
	var width = d3.select("svg").attr("width");
	var height = d3.select("svg").attr("height");
	
	var points = this._points;
	
	circles = d3.select("svg").selectAll("circle");
	if(points.length != circles.size()){
		circles
			.data(points)
			.enter()
			.append("circle");
	}
	
	//Scale the points to their extent
	var YxExtent = d3.extent(this._points, function(d){return d[0];});
	var YyExtent = d3.extent(this._points, function(d){return d[1];});
	
	//Give a margin of 10 to each side of our screen
	var screenMargin = 10;
	var scaleX = d3.scale.linear().domain([YxExtent[0], YxExtent[1]]).range([screenMargin,width-screenMargin]);
	var scaleY = d3.scale.linear().domain([YyExtent[0], YyExtent[1]]).range([screenMargin,height-screenMargin]);
	
	d3.select("svg").selectAll("circle")
		.data(points)
		.attr("cx",function(p){ return scaleX(p[0]);}) 
		.attr("cy", function(p){return scaleY(p[1]);}) 
		.attr("r",3)
		.style("fill",function(point,i){return self._coloringFunction(point,i,points.length);})
		.on("mouseover",function(point,i){
			self._mouseoverPointFunction(point,i,points.length);
		});
}

//coloringFunction(point, idx, numPoints): a function that returns a CSS color given a point, its index in the point array, and the number of points in the point array
PointCloudVisualizer.prototype.setColoringFunction = function(coloringFunction){
	this._coloringFunction = coloringFunction;
}

//mosueoverPointFunction(point, idx, numPoints): a function which performs a mouseover action on a point given the point, its index 
//in the point array, and the number of points in the point array
PointCloudVisualizer.prototype.setMouseoverPointFunction = function(mouseoverPointFunction){
	this._mouseoverPointFunction = mouseoverPointFunction;
}


