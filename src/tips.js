// Tip coordinates calculator
function calculateTip(corner, width, height)
{
	var width2 = Math.floor(width / 2), height2 = Math.floor(height / 2),

	// Define tip coordinates in terms of height and width values
	tips = {
		bottomright:	[[0,0],				[width,height],		[width,0]],
		bottomleft:		[[0,0],				[width,0],				[0,height]],
		topright:		[[0,height],		[width,0],				[width,height]],
		topleft:			[[0,0],				[0,height],				[width,height]],
		topcenter:		[[0,height],		[width2,0],				[width,height]],
		bottomcenter:	[[0,0],				[width,0],				[width2,height]],
		rightcenter:	[[0,0],				[width,height2],		[0,height]],
		leftcenter:		[[width,0],			[width,height],		[0,height2]]
	};

	// Set common side shapes
	tips.lefttop = tips.bottomright; tips.righttop = tips.bottomleft;
	tips.leftbottom = tips.topright; tips.rightbottom = tips.topleft;

	return tips[corner];
}

function Tip(qTip, command)
{
	var self = this,
		opts = qTip.options.style.tip,
		elems = qTip.elements,
		tooltip = elems.tooltip,
		wrapper = elems.wrapper,
		cache = { 
			top: 0, 
			left: 0, 
			corner: { string: function(){} }
		},
		size = {
			width: opts.width,
			height: opts.height
		},
		color = { },
		border = opts.border || 0,
		adjust = opts.adjust || 0,
		method = opts.method || FALSE;

	self.corner = NULL;
	self.mimic = NULL;
	self.checks = {
		'^position.my$': function() {
			// Check if tip corner is automatic and update if so
			if(this.get('style.tip.corner') === TRUE) {
				self.checks['^style.tip.(corner|mimic|method)'].call(this);
			}
		},
		'^style.tip.(corner|mimic|method|border)': function() {
			// Re-determine tip type and update
			border = opts.border;
			self.detectCorner();
			self.update();
			
			// Only update the position if mouse isn't the target
			if(this.get('position.target') !== 'mouse') {
				this.reposition();
			}
		},
		'^style.tip.(height|width)': function() {
			// Re-set dimensions and redraw the tip
			size = {
				width: opts.width,
				height: opts.height
			};
			self.create();
			self.update();

			// Reposition the tooltip
			qTip.reposition();
		},
		'^style.tip.fnCss': function() {
			self.update();
		}
	};

	// Tip position method
	function position(corner)
	{
		var tip = elems.tip,
			corners  = ['left', 'right'],
			ieAdjust = { left: 0, right: 0, top: 0, bottom: 0 },
			offset = 0;

		// Return if tips are disabled or tip is not yet rendered
		if(opts.corner === FALSE || !tip) { return FALSE; }

		// Inherit corner if not provided
		corner = corner || self.corner;

		// Reet initial position
		tip.css({ top: '', bottom: '', left: '', right: '', margin: '' });

		// Setup corners to be adjusted
		corners[ corner.precedance === 'y' ? 'push' : 'unshift' ]('top', 'bottom');

		if($.browser.msie) {
			ieAdjust = {
				top: (corner.precedance === 'y') ? 0 : 0,
				left: 0,
				bottom: (corner.precedance === 'y') ? 0 : 0,
				right: 0
			};
		}

		// Adjust primary corners
		switch(corner[ corner.precedance === 'y' ? 'x' : 'y' ])
		{
			case 'center':
				tip.css(corners[0], '50%').css('margin-'+corners[0], -(size[ (corner.precedance === 'y') ? 'width' : 'height' ] / 2));
			break;

			case corners[0]:
				tip.css(corners[0], ieAdjust[ corners[0] ] + adjust);
			break;

			case corners[1]:
				tip.css(corners[1], ieAdjust[ corners[1] ] + adjust);
			break;
		}

		// Determine adjustments
		offset = size[ (corner.precedance === 'x') ? 'width' : 'height' ];
		if(border) {
			offset -= parseInt(wrapper.css('border-' + corner[ corner.precedance ] + '-width'), 10);
		}
		
		// Adjust secondary corners
		if(corner[corner.precedance] === corners[2]) {
			tip.css(corners[2], -ieAdjust[ corners[2] ] - offset);
		}
		else {
			tip.css(corners[3], ieAdjust[ corners[3] ] - offset);
		}
	}

	function reposition(event, api, position) {
		// Only continue if tip adjustments are enabled
		if(!self.corner.adjust) {
			return FALSE;
		}

		var newCorner = $.extend({}, self.corner),
			newType = self.mimic.adjust ? $.extend({}, self.mimic) : null,
			precedance = newCorner.precedance === 'y' ? ['y', 'top', 'left', 'height'] : ['x', 'left', 'top', 'width'],
			adjusted = position.adjusted,
			offset = parseInt(wrapper.css('border-' + newCorner[ precedance[0] ] + '-width'), 10),
			walk = [newCorner, newType];

		// Adjust tip corners
		$.each(walk, function() {
			if(adjusted.left) {
				this.x = this.x === 'center' ? (adjusted.left > 0 ? 'left' : 'right') : (this.x === 'left' ? 'right' : 'left');
			}
			if(adjusted.top) {
				this.y = this.y === 'center' ? (adjusted.top > 0 ? 'top' : 'bottom') : (this.y === 'top' ? 'bottom' : 'top');
			}
		});

		// Adjust tooltip position if needed in relation to tip element
		position[ precedance[1] ] += (newCorner[ precedance[0] ] === precedance[1] ? 1 : -1) * (size[ precedance[3] ] - offset);
		position[ precedance[2] ] -= adjust;

		// Update and redraw the tip if needed
		if(newCorner.string() !== cache.corner.string() && (cache.top !== adjusted.top || cache.left !== adjusted.left)) { 
			self.update(newCorner, newType);
		}

		// Cache overflow details
		cache.left = adjusted.left;
		cache.top = adjusted.top;
		cache.corner = newCorner;
	}

	function detectColours() {
		var tip = elems.tip,
			precedance = self.mimic[ self.mimic.precedance ],
			borderSide = 'border-' + precedance + '-color';

		// Detect tip colours
		color.fill = tip.css('background-color', '').css('border', '').css('background-color') || 'transparent';
		color.border = tip.get(0).style ? tip.get(0).style['border' + precedance.charAt(0) + precedance.substr(1) + 'Color'] : tip.css(borderSide) || 'transparent';

		// Make sure colours are valid and reset background and border properties
		if((/rgba?\(0, 0, 0(, 0)?\)|transparent/i).test(color.fill)) { color.fill = wrapper.css(border ? 'background-color' : borderSide); }
		if(!color.border || (/rgba?\(0, 0, 0(, 0)?\)|transparent/i).test(color.border)) { color.border = wrapper.css(borderSide) || color.fill; }

		$('*', tip).add(tip).css('background-color', 'transparent').css('border', 0);
	}

	$.extend(self, {
		init: function()
		{
			// Determine tip corner and type
			var properties = self.detectCorner();
			if(properties === FALSE){ return FALSE; }

			// Bind update events
			tooltip.bind('tooltipmove.tip', reposition);

			// Check if rendering method is possible and if not fall back
			if(method === TRUE) {
				method = $('<canvas />')[0].getContext ? 'canvas' : $.browser.msie && ((/center/i).test(self.mimic.string()) || size.height !== size.width) ? 'vml' : 'polygon';
			}
			else {
				if(method === 'canvas') {
					method = $.browser.msie ? 'vml' : !$('<canvas />')[0].getContext ? 'polygon' : 'canvas';
				}
				else if(method === 'polygon') {
					method = $.browser.msie && (/center/i).test(self.mimic.string()) ? 'vml' : method;
				}
			}

			// Create a new tip
			self.create();
			detectColours();
			self.update();

			return self;
		},

		detectCorner: function()
		{
			var corner = opts.corner,
				mimic = opts.mimic || corner,
				at = qTip.options.position.at,
				my = qTip.options.position.my;
				if(my.string) { my = my.string(); }

			// Detect corner and mimic properties
			if(corner === FALSE || (my === FALSE && at === FALSE)) {
				return FALSE;
			}
			else {
				if(corner === TRUE) {
					self.corner = new $.fn.qtip.plugins.Corner(my);
					self.corner.adjust = TRUE;
				}
				else if(!corner.string) {
					self.corner = new $.fn.qtip.plugins.Corner(corner);
				}

				if(mimic === TRUE) {
					self.mimic = new $.fn.qtip.plugins.Corner(my);
				}
				else if(!mimic.string) {
					self.mimic = new $.fn.qtip.plugins.Corner(mimic);
					self.mimic.precedance = self.corner.precedance;
					self.mimic.adjust = TRUE;
				}
			}

			return self.corner.string() !== 'centercenter';
		},

		create: function()
		{
			var width = size.width,
				height = size.height;

			// Create tip element and prepend to the tooltip if needed
			if(elems.tip){ elems.tip.remove(); }
			elems.tip = $('<div class="ui-tooltip-tip ui-widget-content"></div>').css(size).prependTo(tooltip);
			
			// Create tip element
			switch(method)
			{
				case 'canvas':
					elems.tip.append('<canvas height="'+height+'" width="'+width+'" />');
				break;
					
				case 'vml':
					elems.tip.html('<vml:shape coordorigin="0 0" coordsize="'+width+' '+height+'" stroked="' + !!border + '" ' +
						' style="behavior:url(#default#VML); display:inline-block; antialias:TRUE; position: absolute; ' +
						' top:0; left:0; width:'+width+'px; height:'+height+'px; vertical-align:'+self.corner.y+';">' +
						
						'<vml:stroke weight="' + (border-2) + 'px" joinstyle="miter" miterlimit="10" ' + 
							' style="behavior:url(#default#VML); display:inline-block;" />' +
						
						'</vml:shape>');
				break;

				case 'polygon':
					elems.tip.append('<div class="ui-tooltip-tip-inner" />').append(border ? '<div class="ui-tooltip-tip-border" />' : '');
				break;
			}

			return self;
		},

		update: function(corner, mimic)
		{
			var tip = elems.tip,
				width = size.width,
				height = size.height,
				regular = 'px solid ',
				transparent = 'px dashed transparent', // Dashed IE6 border-transparency hack. Awesome!
				i = border > 0 ? 0 : 1,
				translate = Math.ceil(border / 2 + 0.5),
				factor, context, path, coords, inner;

			// Re-determine tip if not already set
			if(!mimic){ mimic = corner ? corner : self.mimic; }
			if(!corner){ corner = self.corner; }
			
			// Inherit tip corners from corner object if not present
			if(mimic.x === 'false') { mimic.x = corner.x; }
			if(mimic.y === 'false') { mimic.y = corner.y; }

			// Find inner child of tip element
			inner = tip.children();

			// Create tip element
			switch(method)
			{
				case 'canvas':
					// Grab canvas context
					context = inner.get(0).getContext('2d');

					// Determine tip coordinates based on dimensions
					if(border) {
						coords = calculateTip(mimic.string(), width * 2, height * 2);
						
						// Setup additional border properties
						context.strokeStyle = color.border;
						context.lineWidth = border + 1;
						context.lineJoin = 'miter';
						context.miterLimit = 100;
						context.translate(
							mimic.x === 'left' ? 0 : mimic.x === 'right' ? -width : -width / 2,
							mimic.y === 'top' ? 0 : mimic.y === 'bottom' ? -height : -height / 2
						);
					}
					else {
						coords = calculateTip(mimic.string(), width, height);
					}
					
					// Setup canvas properties
					context.fillStyle = color.fill;
					context.miterLimit = 0;
					context.clearRect(0,0,3000,3000);

					// Draw the canvas tip (Delayed til after DOM creation)
					for(i; i < 2; i++) {
						context.globalCompositeOperation = i && border ? 'destination-in' : 'source-over';
						context.beginPath();
						context.moveTo(coords[0][0], coords[0][1]);
						context.lineTo(coords[1][0], coords[1][1]);
						context.lineTo(coords[2][0], coords[2][1]);
						context.closePath();
						context.fill();
						if(!i) { context.stroke(); }
					}
					break;
					
				case 'vml':
					// Determine tip coordinates based on dimensions
					coords = calculateTip(mimic.string(), width, height);
					
					// Create coordize and tip path using tip coordinates
					path = 'm' + coords[0][0] + ',' + coords[0][1] + ' l' + coords[1][0] +
						',' + coords[1][1] + ' ' + coords[2][0] + ',' + coords[2][1] + ' xe';

					inner.attr({ 'path': path, 'fillcolor': color.fill });
					
					if(border) {
						inner.children().attr('color', color.border);
						
						if(mimic.precedance === 'y') {
							inner.css('top', (mimic.y === 'top' ? 1 : -1) * (border - 2));
							inner.css('left', (mimic.x === 'left' ? 1 : -2));
						}
						else {
							inner.css('left', (mimic.x === 'left' ? 1 : -1) * (border - 2));
							inner.css('top', (mimic.y === 'top' ? 1 : -2));
						}
						
					}
					break;
					
				case 'polygon':
					// Determine border translations
					if(mimic.precedance === 'y') {
						factor = width > height ? 1.5 : width < height ? 5 : 2.2;
						translate = [
							mimic.x === 'left' ? translate : mimic.x === 'right' ? -translate : 0,
							Math.floor(factor * translate * (mimic.y === 'bottom' ? -1 : 1) * (mimic.x === 'center' ? 0.8 : 1))
						];
					}
					else {
						factor = width < height ? 1.5 : width > height ? 5 : 2.2;
						translate = [
							Math.floor(factor * translate * (mimic.x === 'right' ? -1 : 1) * (mimic.y === 'center' ? 0.9 : 1)),
							mimic.y === 'top' ? translate : mimic.y === 'bottom' ? -translate : 0
						];
					}
					
					inner.removeAttr('style').each(function(i) {
						// Determine what border corners/colors to set
						var toSet = {
								x: mimic.precedance === 'x' ? (mimic.x === 'left' ? 'right' : 'left') : mimic.x,
								y: mimic.precedance === 'y' ? (mimic.y === 'top' ? 'bottom' : 'top') : mimic.y
							},
							path = mimic.x === 'center' ? ['left', 'right', toSet.y, height, width] : ['top', 'bottom', toSet.x, width, height],
							col = color[!i && border ? 'border' : 'fill'];
							
						if(i) { 
							$(this).css({ 'position': 'absolute', 'z-index': 1, 'left': translate[0], 'top': translate[1] });
						}

						// Setup borders based on corner values
						if(mimic.x === 'center' || mimic.y === 'center') {
							$(this).css('border-' + path[2], path[3] + regular + col)
								.css('border-' + path[0], Math.floor(path[4] / 2) + transparent)
								.css('border-' + path[1], Math.floor(path[4] / 2) + transparent);
						}
						else {
							$(this).css('border-width', Math.floor(height / 2) + 'px ' + Math.floor(width / 2) + 'px')
								.css('border-' + toSet.x, Math.floor(width / 2) + regular + col)
								.css('border-' + toSet.y, Math.floor(height / 2) + regular + col);
						}
					});
					break;
			}
			
			// Update position
			position(corner);

			return self;
		},

		destroy: function()
		{
			// Remove previous tip if present
			if(elems.tip) {
				elems.tip.remove();
			}

			// Remove bound events
			tooltip.unbind('tooltipmove.tip');
		}
	});
}

$.fn.qtip.plugins.tip = function(qTip)
{
	var api = qTip.plugins.tip,
		opts = qTip.options.style.tip;

	// Make sure tip options are present
	if(opts && opts.corner) {
		// An API is already present,
		if(api) {
			return api;
		}
		// No API was found, create new instance
		else {
			qTip.plugins.tip = new Tip(qTip);

			if(qTip.plugins.tip.detectCorner()) {
				qTip.plugins.tip.init();
			}
			else {
				delete qTip.plugins.tip;
			}

			return qTip.plugins.tip;
		}
	}
};

// Initialize tip on render
$.fn.qtip.plugins.tip.initialize = 'render';

// Setup plugin sanitization options
$.fn.qtip.plugins.tip.sanitize = function(opts)
{
	if(opts.style !== undefined && opts.style.tip !== undefined) {
		if(typeof opts.style.tip !== 'object'){ opts.style.tip = { corner: opts.style.tip }; }
		if(typeof opts.style.tip.method !== 'string'){ opts.style.tip.method = TRUE; }
		if(!(/canvas|polygon/i).test(opts.style.tip.method)){ opts.style.tip.method = TRUE; }
		if(typeof opts.style.tip.width !== 'number'){ opts.style.tip.width = 14; }
		if(typeof opts.style.tip.height !== 'number'){ opts.style.tip.height = 14; }
		if(typeof opts.style.tip.border !== 'number'){ opts.style.tip.border = 0; }
	}
};

