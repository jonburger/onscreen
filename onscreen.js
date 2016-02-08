
(function(){
	'use strict';
	
	window.OnScreen = (function(window, document, undefined){
		
		var events = {};
		var anims = {};
		var items = {};
		var defaults = {
			screen: { top: 0, right: 0, bottom: 0, left: 0 },
			target: { top: 0, right: 0, bottom: 0, left: 0 },
			screenEnterClass: 'js-screenenter',
			screenLeaveClass: 'js-screenleave',
			onScreenEnter: null,
			onScreenLeave: null,
			onScreenMove: null,
			disableScreenMoveOffScreen: true,
			disableScreenMove: false
		};
		
		function OnScreen(config) {
			
			config = extend({}, defaults, config);
			
			if (document.readyState === 'complete') {
				init();
			}
			else {
				document.addEventListener('DOMContentLoaded', init);
			} 
			
			function init() {
				var scroll = typeof config.scroll === 'string' && config.scroll;
				var target = !scroll ? (config.scroll = scroll = 'window') && window : document.querySelector(scroll);
				
				if (!target) return Error('Cannot init target "' + scroll + '"');
					
				if (!events[scroll]) {
					events[scroll] = [target, function(){ update(scroll); }];
					target.addEventListener('scroll', events[scroll][1]);
		
					window.addEventListener('resize', events[scroll][1]);
					window.addEventListener('load', events[scroll][1]);
				}
				
				if (!items[scroll]) {
					items[scroll] = [config];
				}
				else {
					items[scroll][items[scroll].length] = config;
				}
					
				config.element = typeof config.element === 'string' ? document.querySelector(config.element) : config.element;

				config.disable = function(){
					var index = items[config.scroll].indexOf(config);
						
					if (index > -1) {
						items[config.scroll].splice(index, 1);
					}
					
					return config;
				}
				
				config.enable = function(){
					if (!items[config.scroll]) {
						items[config.scroll] = [config];
					}
					else {
						items[config.scroll][items[config.scroll].length] = config;
					}
					
					return config;
				}
				
				update(scroll);
			}
			
			return config;
		}
		
		
		OnScreen.update = update;
		OnScreen.events = events;
		OnScreen.items = items;
		OnScreen.empty = empty;
		
		
		function empty(scroll) {
			if (scroll) {
				if (events[scroll]) {
					events[scroll][0].removeEventListener('scroll', events[scroll][1]);
					window.removeEventListener('resize', events[scroll][1]);
					window.removeEventListener('load', events[scroll][1]);
					events[scroll] = null;
					delete events[scroll];
				}
				
				if (anims[scroll] !== undefined) {
					anims[scroll] = null;
					delete anims[scroll];
				}
				
				if (items[scroll]) {
					items[scroll] = null;
					delete items[scroll];
				}
			}
			else {
				Object.keys(items).forEach(empty);
			}
		}
		
		
		function update(scroll) {
			if (scroll) {
				if (items[scroll] && !anims[scroll] && items[scroll].length) {
					anims[scroll] = requestAnimationFrame(function() { anims[scroll] = null; process(items[scroll]); });
				}
			}
			else {
				Object.keys(items).forEach(update);
			}
		}
		
		
		function process(items) {
			items.forEach(function (config) {
				
				var element = config.element;

				var sideBefore = config.side;
				var isOnScreen = check(config);
				var sideAfter = config.side;
				var offset = config.offset;
				var detail = { side: isOnScreen ? sideBefore || '' : sideAfter || '', offset: offset, data: config.data };

				var classes = (element.getAttribute('class') || '').match(new RegExp('\\b(' + config.screenEnterClass + '|' + config.screenLeaveClass + ')(-(-(top|bottom|left|right)){0,2})*', 'g')) || [];

				// Screen Enter
				if (isOnScreen) {

					// make sure to only fire once
					if (!config.onscreen) {
						config.onscreen = true;

						if (!dispatchEvent(element, 'screenenter', detail) ||
							(config.onScreenEnter && config.onScreenEnter.call(element, detail) === false)) {
							return
						}

						classes.forEach(function (className) {
							element.classList.remove(className);
						});

						element.classList.add(config.screenEnterClass);
						if (sideBefore) element.classList.add(config.screenEnterClass + '--' + sideBefore);
					}
				}

				// Screen Leave
				else {

					// make sure to only fire once
					if (config.onscreen) {
						config.onscreen = false;

						if (!dispatchEvent(element, 'screenleave', detail) ||
							(config.onScreenLeave && config.onScreenLeave.call(element, detail) === false)) {
							return;
						}

						classes.forEach(function (className) {
							element.classList.remove(className);
						});

						element.classList.add(config.screenLeaveClass);
						if (sideAfter) element.classList.add(config.screenLeaveClass + '--' + sideAfter);
					}
				}

				// Screen Move
				if (!config.disableScreenMove && (isOnScreen || !config.disableScreenMoveOffScreen)) {

					if (!dispatchEvent(element, 'screenmove', detail) ||
						(config.onScreenMove && config.onScreenMove.call(element, detail) === false)) {
						return;
					}
				}
				
			});
		}
		
		
		function check(config) {
			
			var targetBounds = config.element.getBoundingClientRect(),
				screenBounds = {
					top: 0,
					right: window.innerWidth,
					bottom: window.innerHeight,
					left: 0,
					width: window.innerWidth,
					height: window.innerHeight
				};

			var targetRect = getModifiedRect(targetBounds, config.target),
				screenRect = getModifiedRect(screenBounds, config.screen);

			var offsetTop = targetRect.top - screenRect.top,
				offsetRight = screenRect.right - targetRect.right,
				offsetBottom = screenRect.bottom - targetRect.bottom,
				offsetLeft = targetRect.left - screenRect.left;

			var insideHeight = screenRect.height - targetRect.height,
				insideWidth = screenRect.width - targetRect.width;

			var outsideHeight = screenRect.height + targetRect.height,
				outsideWidth = screenRect.width + targetRect.width;

			var offset = {
				top: offsetTop / screenRect.height || 0,
				right: offsetRight / screenRect.width || 0,
				bottom: offsetBottom / screenRect.height || 0,
				left: offsetLeft / screenRect.width || 0,

				inside: {
					top: offsetTop / insideHeight || 0,
					right: offsetRight / insideWidth || 0,
					bottom: offsetBottom / insideHeight || 0,
					left: offsetLeft / insideWidth || 0
				},

				outside: {
					top: (targetRect.bottom - screenRect.top) / outsideHeight || 0,
					right: (screenRect.right - targetRect.left) / outsideWidth || 0,
					bottom: (screenRect.bottom - targetRect.top) / outsideHeight || 0,
					left: (targetRect.right - screenRect.left) / outsideWidth || 0
				}
			};

			var side = [];

			// check side: top / bottom
			if (targetRect.bottom <= screenRect.top) {
				side[side.length] = 'top';
			}
			else if (targetRect.top >= screenRect.bottom) {
				side[side.length] = 'bottom';
			}

			// check side: left / right
			if (targetRect.right <= screenRect.left) {
				side[side.length] = 'left';
			}
			else if (targetRect.left >= screenRect.right) {
				side[side.length] = 'right';
			}

			// set offset
			config.offset = offset;

			// set side and return visibility
			if (side.length) {
				config.side = side.join('-');
				return false;
			}
			else {
				return true;
			}
		}


		function getModifiedRect(rect, mods) {
			var width = rect.width || (rect.right - rect.left);
			var height = rect.height || (rect.bottom - rect.top);
			var ranges = [width, height];
			var modRect = {};

			mods = mods || {};

			modRect.top = rect.top + (mods.top ? getModifierValue(mods.top, getModifierRange(mods.top, ranges, 1)) : 0);
			modRect.left = rect.left + (mods.left ? getModifierValue(mods.left, getModifierRange(mods.left, ranges, 0)) : 0);
			modRect.right = mods.width ? modRect.left + getModifierValue(mods.width, getModifierRange(mods.width, ranges, 0)) : rect.right - (mods.right ? getModifierValue(mods.right, getModifierRange(mods.right, ranges, 0)) : 0);
			modRect.bottom = mods.height ? modRect.top + getModifierValue(mods.height, getModifierRange(mods.height, ranges, 1)) : rect.bottom - (mods.bottom ? getModifierValue(mods.bottom, getModifierRange(mods.bottom, ranges, 1)) : 0);

			modRect.width = modRect.right - modRect.left;
			modRect.height = modRect.bottom - modRect.top;

			return modRect;
		}
		
		
		function getModifierRange(modifier, ranges, def) {
			var mod = '' + (typeof modifier === 'function' ? modifier() : modifier);
			return { 'vw': ranges[0], 'vh': ranges[1] }[mod.match(/vw|vh|$/)[0]] || ranges[def];
		}


		function getModifierValue(modifier, range) {
			var mod = '' + (typeof modifier === 'function' ? modifier() : modifier);
			return /\d(%|vw|vh)$/.test(mod) ? (parseFloat(mod) / 100) * range : parseFloat(mod || '0');
		}
		
		
		function dispatchEvent(element, name, data) {
			var event;

			if (typeof CustomEvent === 'function') {
				event = new CustomEvent(name, {
					detail: data,
					bubbles: true,
					cancelable: true
				});
			}
			else {
				event = document.createEvent('CustomEvent');
				event.initCustomEvent(name, true, true, data);
			}

			return !!element.dispatchEvent(event);
		}
		
		
		function extend(target) {
			target = target || {};
			
			[].slice.call(arguments, 1).forEach(function (source) {
				for (var property in source) {
					if (source.hasOwnProperty(property)) {
						if ({}.toString.call(source[property]) === '[object Object]') {
							target[property] = extend(target[property] || {}, source[property]);
						} else {
							target[property] = source[property];
						}
					}
				}
			});
			
			return target;
		}
		
		
		return OnScreen;
		
		
	}(window, document));
}());