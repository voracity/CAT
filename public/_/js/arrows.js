var draw = {
	makeSvg: function(tag, attrs) {
		var el= document.createElementNS('http://www.w3.org/2000/svg', tag);
		for (var k in attrs) {
			el.setAttribute(k, attrs[k]);
		}
		return el;
	},
	drawArrow: function(outputEl, from, to) {
		var sx = sy = 10; //startX, startY
		var width = Math.abs(from.x - to.x);
		var height = Math.abs(from.y - to.y);

		var $svg = null;
		var insideSvg = $(outputEl)[0].tagName.toUpperCase() == "SVG";
		var isPath = $(outputEl)[0].tagName.toUpperCase() == "PATH";

		if (insideSvg) {
			$svg = $(outputEl);
		}
		else if (isPath) {
		
		}
		else {
			$svg = $("<svg width="+(width+20)+" height="+(height+20)+"><defs>\
				<marker id='arrowhead' viewBox='0 0 10 10' refX='10' refY='5' \
				markerUnits='strokeWidth' orient='auto'\
				markerWidth='10' markerHeight='9'>\
				<polyline points='0,0 10,5 0,10 1,5' fill=black/>\
				</marker>\
				</defs></svg>").appendTo(outputEl);
		}

		var firstX, firstY, lastX, lastY, svgX, svgY;
		if (from.x < to.x) { firstX = sx; lastX = sx+width; svgX = from.x; }
		else { firstX = sx+width; lastX = sx; svgX = to.x; }
		if (from.y < to.y) { firstY = sy; lastY = sy+height; svgY = from.y; }
		else { firstY = sy+height; lastY = sy; svgY = to.y; }

		//onsole.debug(svgX, svgY);
		var path = null;
		if (insideSvg) {
			$svg.append(path = this.makeSvg("path", {
				d: "M "+(svgX-sx+firstX)+" "+(svgY-sy+firstY)+" L "+(svgX-sx+lastX)+" "+(svgY-sy+lastY),
				stroke: "black",
				"class": 'dependency',
				"stroke-width": 1,
				"marker-end": "url(#arrowhead)"
			}));
			var clickable = null;
			$svg.append(clickable = this.makeSvg("path", {
				d: "M "+(svgX-sx+firstX)+" "+(svgY-sy+firstY)+" L "+(svgX-sx+lastX)+" "+(svgY-sy+lastY),
				stroke: "transparent",
				"class": 'dependencyClickArea',
				"stroke-width": 7,
			}));
			$(path).data("clickable", $(clickable));
			$(clickable).data("path", $(path));
		}
		else if (isPath) {
			/// If we've been given a path, just update the d attribute
			var path = $(outputEl).attr("d", "M "+(svgX-sx+firstX)+" "+(svgY-sy+firstY)+" L "+(svgX-sx+lastX)+" "+(svgY-sy+lastY));
		}
		else {
			$svg.append(path = this.makeSvg("path", {
				d: "M "+firstX+" "+firstY+" L "+lastX+" "+lastY,
				stroke: "black",
				"stroke-width": 1,
				"marker-end": "url(#arrowhead)"
			}))
				.css({left: svgX-sx, top: svgY-sy, position: "absolute"});
		}
		return path;
	},
	drawArrowBetweenBoxes: function(outputEl, from, to) {
		this.addCenter(from);
		this.addCenter(to);
		
		/// Get line
		var m = null, c = null;
		if (to.cx-from.cx) {
			m = (to.cy-from.cy)/(to.cx-from.cx);
			c = to.cy - m*to.cx;
		}
		else {
			c = to.cx;
		}
		
		/// Test each edge of from
		var ints = this.getIntersects(from, [m,c]);
		var fromInt = ints[0];
		if (this.dist(ints[1],[to.cx,to.cy]) < this.dist(ints[0],[to.cx,to.cy])) {
			fromInt = ints[1];
		}
		
		/// Test each edge of to
		ints = this.getIntersects(to, [m,c]);
		var toInt = ints[0];
		if (this.dist(ints[1],[from.cx,from.cy]) < this.dist(ints[0],[from.cx,from.cy])) {
			toInt = ints[1];
		}
		
		return this.drawArrow(outputEl, {x:fromInt[0],y:fromInt[1]}, {x:toInt[0],y:toInt[1]});
	},
	dist: function(p1, p2) {
		return Math.sqrt(Math.pow(p1[0]-p2[0],2) + Math.pow(p1[1]-p2[1],2));
	},
	getIntersects: function(box, line) {
		var [m,c] = line;
		var intersects = [];
		var y = box.top;
		var x = m!==null ? (y - c)/m : c;
		if (box.left <= x && x <= box.left+box.width) {
			intersects.push([x,y]);
		}
		y = box.top+box.height;
		x = m!==null ? (y - c)/m : c;
		if (box.left <= x && x <= box.left+box.width) {
			intersects.push([x,y]);
		}
		if (m!==null) {
			x = box.left;
			y = m*x + c;
			if (box.top <= y && y <= box.top+box.height) {
				intersects.push([x,y]);
			}
			x = box.left+box.width;
			y = m*x + c;
			if (box.top <= y && y <= box.top+box.height) {
				intersects.push([x,y]);
			}
		}
		return intersects;
	},
	addCenter: function(box) {
		box.cx = box.left + box.width/2;
		box.cy = box.top + box.height/2;
	},
	getBox: function(el) {
		var box = {width: $(el).outerWidth(), height: $(el).outerHeight(),
			left: $(el)[0].offsetLeft, top: $(el)[0].offsetTop};
		return box;
	},
	drawArrowBetweenEls: function(outputEl, fromEl, toEl) {
		var path = this.drawArrowBetweenBoxes(outputEl, this.getBox(fromEl), this.getBox(toEl));
		$(path).attr('data-can-redraw', true).data('redraw', {outputEl, fromEl, toEl});
		return path;
	},
	updateArrows: function(outputEl) {
		$(outputEl).find('path[data-can-redraw]').each(function() {
			var {outputEl, fromEl, toEl} = $(this).data('redraw');
			//onsole.log(fromEl, toEl);
			$(this).closest('svg').remove();
			if ($(outputEl).is(':visible') && $(fromEl).is(':visible') && $(toEl).is(':visible')) {
				draw.drawArrowBetweenEls(outputEl, fromEl, toEl);
			}
		});
	},
}
