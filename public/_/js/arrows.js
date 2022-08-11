var draw = {
	makeSvg: function(tag, attrs, content) {
		var el= document.createElementNS('http://www.w3.org/2000/svg', tag);
		for (var k in attrs) {
			el.setAttribute(k, attrs[k]);
		}
		if (content) for (let c of content) {
			el.append(c);
		}
		return el;
	},
	drawArrow: function(outputEl, from, to, opts = {}) {
		var sx = sy = 40; //startX, startY (padding for the svg)
		var width = Math.abs(from.x - to.x);
		var height = Math.abs(from.y - to.y);

		var $svg = null;
		var insideSvg = $(outputEl)[0].tagName.toUpperCase() == "SVG";
		var isPath = $(outputEl)[0].tagName.toUpperCase() == "PATH";
		
		if (insideSvg) {
			$svg = $(outputEl);
		}
		else if (isPath) {
			/// Retrieve saved opts
			opts = $(outputEl).data('opts');
		}
		else {
			$svg = $("<svg width="+(width+sx*2)+" height="+(height+sy*2)+" data-standalone='true'><style>\
				.arc { stroke: black; stroke-width: 1; }\
				.arc .bar { opacity: 0; }\
				.blocked.arc { stroke: gray; fill:gray; stroke-width: 1; }\
				.blocked.arc .bar { opacity: 1; }\
				</style>\
				<defs>\
				<marker id='arrowhead' viewBox='0 0 10 10' refX='10' refY='5' \
				markerUnits='strokeWidth' orient='auto'\
				markerWidth='10' markerHeight='9'>\
				<polyline points='0,0 10,5 0,10 1,5' fill=black/>\
				</marker>\
				<marker id='arrowheadBlocked' viewBox='0 -3 10 16' refX='10' refY='5' \
				markerUnits='strokeWidth' orient='auto'\
				markerWidth='10' markerHeight='15'>\
				<polyline points='0,0 10,5 0,10 1,5' fill=black/>\
				<path d='M 9 13 L 9 -3' stroke=black stroke-width=3/>\
				</marker>\
				</defs></svg>").appendTo(outputEl);
		}

		var firstX, firstY, lastX, lastY, svgX, svgY;
		if (from.x < to.x) { firstX = sx; lastX = sx+width; svgX = from.x; }
		else { firstX = sx+width; lastX = sx; svgX = to.x; }
		if (from.y < to.y) { firstY = sy; lastY = sy+height; svgY = from.y; }
		else { firstY = sy+height; lastY = sy; svgY = to.y; }

		/// Add a margin for blocked paths
		//opts.isBlocked = true;
		let blockedMarker = '';
		let marginEndX = 0;
		let marginEndY = 0;
		let strokeWidth = 1;
		let arrowheadLength = 10;
		let gap = arrowheadLength;
		if (opts.isBlocked) {
			blockedMarker = 'Blocked';
			gap = arrowheadLength + 20;
		}
		let ratio = height/width; /// Infinity's already handled nicely!
		let gapWidth = Math.sign(to.x - from.x) * Math.sqrt(gap**2/(ratio**2+1));
		let gapHeight = Math.sign(to.y - from.y) * Math.sqrt(gap**2 - gapWidth**2);
		marginEndX = gapWidth; marginEndY = gapHeight;
		if (opts.strokeWidth) {
			strokeWidth = opts.strokeWidth;
		}
		//console.log(marginEndX, marginEndY);

		//onsole.debug(svgX, svgY);
		var path = null;
		let startX = svgX-sx+firstX;
		let startY = svgY-sy+firstY;
		let endX = svgX-sx+lastX-marginEndX;
		let endY = svgY-sy+lastY-marginEndY;
		function doDraw() {
			
		}
		if (insideSvg) {
			$svg.append(path = this.makeSvg("path", {
				d: "M "+(startX)+" "+(startY)+" L "+(endX)+" "+(endY),
				stroke: "black",
				"class": 'dependency',
				"stroke-width": strokeWidth,
				//"marker-end": `url(#arrowhead${blockedMarker})`
			}));
			$svg.append(this.makeSvg('path', {
				d: `M${startX+3},${startY} l-3,-5 l10,5 l-10,5 l3,-5 Z`,
				fill: 'black',
			}));
			var clickable = null;
			$svg.append(clickable = this.makeSvg("path", {
				d: "M "+(svgX-sx+firstX)+" "+(svgY-sy+firstY)+" L "+(svgX-sx+lastX-marginEndX)+" "+(svgY-sy+lastY-marginEndY),
				stroke: "transparent",
				"class": 'dependencyClickArea',
				"stroke-width": strokeWidth+6,
			}));
			$(path).data("clickable", $(clickable));
			$(clickable).data("path", $(path));
		}
		else {
			let toDeg = 360/(2*Math.PI);
			let endX = lastX-marginEndX;
			let endY = lastY-marginEndY;
			let ratio = (lastY-firstY)/(lastX-firstX);
			let angle = (Math.atan(ratio) + Math.PI*(lastX-firstX<0))*toDeg;
			if (isPath) {
				/// If we've been given a path, just update what we need to
				let $arc = $(outputEl).closest('[data-standalone]').find('.arc');
				if (opts.isBlocked) { $arc.addClass('blocked'); }
				else { $arc.removeClass('blocked'); }
				let $svg = $(outputEl).closest('svg');
				if ($arc.length) {
					path = $arc.find('.line');
					
					$svg.attr('width',width+sx*2);
					$svg.attr('height', height+sy*2);
					$svg.css({left: svgX-sx, top: svgY-sy, position: "absolute"});
					
					path.attr('d', "M "+firstX+" "+firstY+" L "+(lastX-marginEndX)+" "+(lastY-marginEndY));
					//$svg.find('.head').attr('transform', `rotate(${angle},${endX},${endY})`);
					$svg.find('.head').css({transform: `rotate(${angle}deg)`, 'transform-origin': `${endX}px ${endY}px`});
					$svg.find('.triangle').attr('d', `M${endX},${endY} l-1,-4 l10,4 l-10,4 l1,-4 Z`);
					$svg.find('.bar').attr('d', `M${endX+arrowheadLength},${endY} v-8 v16`);
				}
				else {
					path = $(outputEl).attr("d", "M "+(svgX-sx+firstX)+" "+(svgY-sy+firstY)+" L "+(svgX-sx+lastX-marginEndX)+" "+(svgY-sy+lastY-marginEndY));
				}
			}
			else {
				let block = this.makeSvg('path', {d:`M${endX+arrowheadLength},${endY} v-8 v16`, 'stroke-width': '2', class: 'bar'});
				let endpoints = {};
				if (opts.parent)  endpoints['data-parent'] = opts.parent;
				if (opts.child)   endpoints['data-child'] = opts.child;
				$svg.append(this.makeSvg('g', {class: opts.isBlocked ? 'blocked arc': 'arc', ...endpoints}, [
					path = this.makeSvg("path", {
						d: "M "+firstX+" "+firstY+" L "+(lastX-marginEndX)+" "+(lastY-marginEndY),
						class: 'line',
						//"marker-end": `url(#arrowhead${blockedMarker})`
					}),
					/* 'transform': `rotate(${angle},${endX},${endY})` */
					this.makeSvg('g', {style: `transform: rotate(${angle}deg); transform-origin: ${endX}px ${endY}px;`, 'class': 'head'}, [
						this.makeSvg('path', {
							d: `M${endX},${endY} l-1,-4 l10,4 l-10,4 l1,-4 Z`,
							class: 'triangle',
						}),
						block
					])
				]))
					.css({left: svgX-sx, top: svgY-sy, position: "absolute"});
			}
		}
		/// Store opts for next time, if updating
		$(path).data('opts', opts);
		return path;
	},
	drawArrowBetweenBoxes: function(outputEl, from, to, opts = {}) {
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
		
		return this.drawArrow(outputEl, {x:fromInt[0],y:fromInt[1]}, {x:toInt[0],y:toInt[1]}, opts);
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
		/*var box = {width: $(el).outerWidth(), height: $(el).outerHeight(),
			left: $(el)[0].offsetLeft, top: $(el)[0].offsetTop};*/
		/// getBoundingClientRect takes into account transforms
		let elBox = el.getBoundingClientRect();
		let parBox = el.parentNode.getBoundingClientRect();
		let scrollTop = el.parentNode.scrollTop;
		let scrollLeft = el.parentNode.scrollLeft;
		let box = {width: elBox.width, height: elBox.height, left: elBox.left-parBox.left+scrollLeft, top: elBox.top-parBox.top+scrollTop};
		return box;
	},
	drawArrowBetweenEls: function(outputEl, fromEl, toEl, opts = {}) {
		var path = this.drawArrowBetweenBoxes(outputEl, this.getBox(fromEl), this.getBox(toEl), opts);
		$(path).attr('data-can-redraw', true).data('redraw', {outputEl, fromEl, toEl});
		return path;
	},
	/// Arcs track which from/to elements they belong to
	updateArrows: function(outputEl) {
		$(outputEl).find('path[data-can-redraw]').each(function() {
			let opts = $(this).data('opts');
			var {outputEl, fromEl, toEl} = $(this).data('redraw');
			//onsole.log(fromEl, toEl);
			//$(this).closest('svg').remove();
			if ($(outputEl).is(':visible') && $(fromEl).is(':visible') && $(toEl).is(':visible')) {
				draw.drawArrowBetweenEls(this, fromEl, toEl, opts);
			}
		});
	},
}
