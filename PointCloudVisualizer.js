
function PointCloudVisualizer(svgNode){
	this._svgNode = d3.select(svgNode);
	this._kMeansClusters = 26;
	
	//set once a given set of points has been rendered
	this._scaleX = null;
	this._scaleY = null;
	
	var self = this;
	var keysDown = {};
	d3.select("body").on("keydown.PointCloud", function(){
		var clusterIdx = d3.event.keyCode - 65;
		//only respond to characters a-z
		if(clusterIdx <0 || clusterIdx > self._kMeansClusters){
			return;
		}
		
		if(keysDown[clusterIdx]){
			return;
		}
		self._indicesByCluster && self._toggleClusterCallback && self._toggleClusterCallback(clusterIdx,self._indicesByCluster[clusterIdx]);
		keysDown[clusterIdx] = true;
	});
	
	d3.select("body").on("keyup.PointCloud", function(){
		var clusterIdx = d3.event.keyCode - 65;
		keysDown[clusterIdx] = false;
		
		if(clusterIdx <0 || clusterIdx > self._kMeansClusters){
			return;
		}
		
		self._indicesByCluster && self._deToggleClusterCallback && self._deToggleClusterCallback(clusterIdx);
	});
}

//points: an array of 2-element arrays, where the first element = the x coordinate and the second element = the y coordinate
PointCloudVisualizer.prototype.update = function(points){
	this._points = points;
}

PointCloudVisualizer.prototype.updateAndDraw = function(points){
	this.update(points);
	this.draw();
}

PointCloudVisualizer.prototype._removeKMeansGraphics = function(){
	//eliminate the k-means graphics
	this._svgNode.selectAll(".kmeans").remove();
}

PointCloudVisualizer.prototype.draw = function(){
	
	var self = this;
	var width = this._svgNode.attr("width");
	var height = this._svgNode.attr("height");
	
	var points = this._points;
	
	this._removeKMeansGraphics();
	
	var circles = this._svgNode.selectAll("circle.point");
	if(points.length != circles.size()){
		circles
			.data(points)
			.enter()
			.append("circle")
			.attr("class","point");
	}
	
	//Scale the points to their extent
	var YxExtent = d3.extent(this._points, function(d){return d[0];});
	var YyExtent = d3.extent(this._points, function(d){return d[1];});
	
	//Give a margin of 10 to each side of our screen
	var screenMargin = 10;
	var scaleX = this._scaleX = d3.scale.linear().domain([YxExtent[0], YxExtent[1]]).range([screenMargin,width-screenMargin]);
	var scaleY = this._scaleY =  d3.scale.linear().domain([YyExtent[0], YyExtent[1]]).range([screenMargin,height-screenMargin]);
	
	this._svgNode.selectAll("circle.point")
		.data(points)
		.attr("class",function(p,i){return "point " + "_" + i;}) //give each point its own class based on index
		.attr("cx",function(p){ return scaleX(p[0]);}) 
		.attr("cy", function(p){return scaleY(p[1]);}) 
		.attr("r",3)
		.style("fill",function(point,i){return self._coloringFunction(i,points.length);})
		.on("mouseover.plugin",function(point,i){
			self._mouseoverPointFunction(i,points.length);
		})
		.on("mouseover.highlight",function(point,i){
			self.highlightIdx(i);
			self._highlightedCallback && self._highlightedCallback(i);
		})
		.on("mouseleave.highlight",function(point,i){
			self.deHighlightIdx(i);
			self._deHighlightedCallback && self._deHighlightedCallback(i);
		})
}

//coloringFunction( idx, numPoints): a function that returns a CSS color given a point, its index in the point array, and the number of points in the point array
PointCloudVisualizer.prototype.setColoringFunction = function(coloringFunction){
	this._coloringFunction = coloringFunction;
}

//mosueoverPointFunction( idx, numPoints): a function which performs a mouseover action on a point given the point, its index 
//in the point array, and the number of points in the point array
PointCloudVisualizer.prototype.setMouseoverPointFunction = function(mouseoverPointFunction){
	this._mouseoverPointFunction = mouseoverPointFunction;
}

PointCloudVisualizer.prototype.setHighlightedCallback = function(highlightedCallback){
	this._highlightedCallback = highlightedCallback;
}

PointCloudVisualizer.prototype.setDeHighlightedCallback = function(deHighlightedCallback){
	this._deHighlightedCallback = deHighlightedCallback;
}

//calback(clusterIdx,clusterIndices)
PointCloudVisualizer.prototype.setToggleClusterCallback = function (toggleClusterCallback){
	this._toggleClusterCallback = toggleClusterCallback;
}

//callback(clusterIdx)
PointCloudVisualizer.prototype.setDeToggleClusterCallback = function(deToggleClusterCallback){
	this._deToggleClusterCallback = deToggleClusterCallback;
};

PointCloudVisualizer.prototype.highlightIdx = function(idx){
	this._svgNode.select("circle._" + idx)
		.style("fill",d3.rgb(255,0,0))
		.attr("r",5);
}

PointCloudVisualizer.prototype.deHighlightIdx = function(idx){
	var numPoints = this._points.length;
	var self = this;
	this._svgNode.select("circle._" + idx)
		.style("fill",function(point,i){return self._coloringFunction(i,numPoints);})
		.attr("r",3);
}

PointCloudVisualizer.prototype.getKMeans = function(){

	this._removeKMeansGraphics();
	
	var self = this;
	var nClusters = this._kMeansClusters;
	var kmeans = figue.kmeans(nClusters,this._points);
	
	var indicesByCluster= {};
	convexHullByCluster = {};
	d3.range(nClusters).forEach(function(i){
		indicesByCluster[i] = [];
	});
	
	for(var i = 0; i<this._points.length; i++){
		var assignment = kmeans.assignments[i];
		indicesByCluster[assignment].push(i);
	}
	
	this._indicesByCluster = indicesByCluster;

	for(var i = 0; i<nClusters; i++){
		var cluster = indicesByCluster[i];
		
		var convexHull = new ConvexHullGrahamScan();
		
		
		cluster.forEach(function(pointIdx){
			var point =	self._points[pointIdx];
			convexHull.addPoint(point[0],point[1]);
		});
		hullPoints = convexHull.getHull();
		convexHullByCluster[i] = hullPoints;
	}
	
	var lineFunction = d3.svg.line()
		.x(function(p) { return self._scaleX(p.x); })
		.y(function(p) { return self._scaleY(p.y); })
		.interpolate("cardinal-closed");
		
	
	for(var i = 0; i<nClusters; i++){
		var hull = convexHullByCluster[i];
		var xCenter = d3.sum(hull, function(p){return self._scaleX(p.x)});
		var yCenter = d3.sum(hull, function(p){return self._scaleY(p.y)});
		xCenter/= hull.length;
		yCenter/= hull.length;
		
		var lineGraph = this._svgNode.append("path")
			.attr("d", lineFunction.tension(.7)(hull))
			.attr("stroke", "blue")
			.attr("stroke-width", 2)
			.attr("fill", "none")
			.attr("class","kmeans");
			
		var node = this._svgNode.append("g")
			.attr("transform", "translate(" + xCenter + "," + yCenter + ")")
			.attr("class","kmeans");
			
		var circle = node.append("circle")
			.attr("r",10)
			.attr("fill","url(#RadialGradient)");
		
		var character = String.fromCharCode(65+i);
		var text = node.append("text")
		.attr("x",0)
		.attr("y",0)
		.text(character)
		.style("fill",d3.rgb(255,255,255))
		.style("font-size",12)
		.style("text-anchor","middle")
		.style("dominant-baseline","central");
	}
	
}


