var mouseobj = {}; //just some object for potential future multi-drag-action.
var touchobjs = [];

function startdrag(node, pointer, pointerX, pointerY) {
	if (node.dragInfo) {
		console.debug("Trying to double-drag.");
		return;
	}
	node.classList.add('dragging');
	node.dragInfo = {
		pointer:pointer,
		startX:node.offsetLeft,
		startY:node.offsetTop
	};
	pointer.dragInfo = {
		node:node,
		startX:pointerX,
		startY:pointerY,
	};

	updateWinCondition();
}

function updatedrag(pointer, pointerX, pointerY) {
	if (!pointer.dragInfo) {
		console.error("pointer not doing dragging");
		return;
	}
	var node = pointer.dragInfo.node;
	if (!node) {
		console.error("draginfo with blank node!!");
		return;
	}
	if (!node.dragInfo) {
		console.error("node not being dragged");
		return;
	}
	if (node.dragInfo.pointer != pointer) {
		console.error("messed up dragInfo coupling");
		return;
	}
	node.style.left = (node.dragInfo.startX + (pointerX - pointer.dragInfo.startX)) + 'px';
	node.style.top = (node.dragInfo.startY + (pointerY - pointer.dragInfo.startY)) + 'px';

	updateSortOrder();
}
function stopdrag(pointer) {
	if (!pointer.dragInfo) {
		console.error("trying to stop a drag that isn't happening");
		return;
	}
	pointer.dragInfo.node.classList.remove('dragging');
	delete pointer.dragInfo.node.dragInfo;
	delete pointer.dragInfo;

	updateSortOrder();
	updateWinCondition();
}

function updateSortOrder() {
	var tilesList = document.getElementsByClassName("tile");
	var tiles = [];
	for (var i = 0; i < tilesList.length; ++i) {
		tiles.push(tilesList[i]);
	}
	delete tilesList;

	for (var i = 0; i < tiles.length; ++i) {
		var tile = tiles[i];
		if (tile.dragInfo) {
			//get is relative to viewport:
			tile.key = (tile.offsetLeft + 0.5 * tile.offsetWidth) / window.innerWidth;
		} else if (tile.hasOwnProperty('order')) {
			tile.key = (tile.order + 0.5) / tiles.length;
		} else {
			tile.key = (i + 0.5) / tiles.length;
		}
	}
	tiles.sort(function(a,b) {
		return a.key - b.key;
	});
	for (var i = 0; i < tiles.length; ++i) {
		delete tiles[i].key;
		tiles[i].order = i;
	}
}

function updateWinCondition() {
	var tiles = document.getElementsByClassName("tile");

	var winning = true;
	for (var i = 0; i < tiles.length; ++i) {
		var tile = tiles[i];
		if (tile.hasAttribute('goalOrder')) {
			var goalOrder = parseInt(tile.getAttribute('goalOrder')) - 1;
			if (goalOrder != tile.order) {
				winning = false;
			}
		}
		if (tile.dragInfo) {
			winning = false;
		}
	}
	if (winning) {
		document.body.classList.add('winning');
	} else {
		document.body.classList.remove('winning');
	}
}

var prevTimestamp;
function draw(timestamp) {
	var elapsed = 0.0;
	if (prevTimestamp) {
		elapsed = (timestamp - prevTimestamp) / 1000.0;
	}
	prevTimestamp = timestamp;

	var tiles = document.getElementsByClassName("tile");

	var maxTileWidth = (window.innerWidth / tiles.length) * 0.9;
	var maxTileHeight = window.innerHeight * 0.9;

	for (var i = 0; i < tiles.length; ++i) {
		var tile = tiles[i];

		var w = tile.naturalWidth;
		var h = tile.naturalHeight;

		if (w > maxTileWidth) {
			var scale = maxTileWidth / w;
			w *= scale;
			h *= scale;
		}
		if (h > maxTileHeight) {
			var scale = maxTileHeight / h;
			w *= scale;
			h *= scale;
		}

		w = Math.round(w);
		h = Math.round(h);

		if (w != tile.width || h != tile.height) {
			tile.width = w;
			tile.height = h;
		}

		if (!tile.hasOwnProperty('velX')) tile.velX = 0.0;
		if (!tile.hasOwnProperty('velY')) tile.velY = 0.0;
		if (!tile.hasOwnProperty('atX')) tile.atX = tile.offsetLeft;
		if (!tile.hasOwnProperty('atY')) tile.atY = tile.offsetTop;

		if (tile.dragInfo) {
			tile.velX = 0.0;
			tile.velY = 0.0;
			tile.atX = tile.offsetLeft;
			tile.atY = tile.offsetTop;
			continue;
		}

		var frac = (tile.order + 0.5) / tiles.length;
		var wantX = Math.round(window.innerWidth * frac - 0.5 * tile.offsetWidth);
		var wantY = Math.round(window.innerHeight * 0.5 - 0.5 * tile.offsetHeight);


		var springConstant = 0.3 * window.innerWidth;
		var dampping = Math.pow(0.5, elapsed / 0.04);

		var accX = springConstant * (wantX - tile.atX);
		tile.velX = dampping * tile.velX + elapsed * accX;
		tile.atX += elapsed * tile.velX;

		var accY = springConstant * (wantY - tile.atY);
		tile.velY = dampping * tile.velY + elapsed * accY;
		tile.atY += elapsed * tile.velY;

		tile.style.left = Math.round(tile.atX) + 'px';
		tile.style.top = Math.round(tile.atY) + 'px';
	}

	window.requestAnimFrame(draw);
}

function setup() {

	updateSortOrder();
	updateWinCondition();

	//set up animation:
	window.requestAnimFrame =
		window.requestAnimationFrame
		|| window.webkitRequestAnimationFrame
		|| window.mozRequestAnimationFrame
		|| window.oRequestAnimationFrame
		|| window.msRequestAnimationFrame
		|| function(callback) {
          window.setTimeout(callback, TICK);
        };
	window.requestAnimFrame(draw);

	//set up dragging:
	window.onmousedown = function(ev) {
		ev.preventDefault();
		var elt = ev.target;
		if (elt.classList.contains("tile")) {
			startdrag(elt, mouseobj, ev.pageX, ev.pageY);
		}
	}
	window.onmousemove = function(ev) {
		ev.preventDefault();
		if (mouseobj.dragInfo) {
			updatedrag(mouseobj, ev.pageX, ev.pageY);
		}
	}
	window.onmouseup = function(ev) {
		ev.preventDefault();
		if (mouseobj.dragInfo) {
			stopdrag(mouseobj);
		}
	}
	window.addEventListener('touchstart', function(ev) {
		ev.preventDefault();
		var touches = ev.changedTouches;
		for (var i = 0; i < touches.length; ++i) {
			var touch = touches[i];
			if (!touch.target.classList.contains("tile")) continue;
			var touchobj = {id:touch.identifier};
			touchobjs.push(touchobj);
			startdrag(touch.target, touchobj, touch.pageX, touch.pageY);
		}
	});
	window.addEventListener('touchmove', function(ev) {
		ev.preventDefault();
		var touches = ev.changedTouches;
		for (var i = 0; i < touches.length; ++i) {
			var touch = touches[i];
			var touchobj = null;
			for (var o = 0; o < touchobjs.length; ++o) {
				if (touchobjs[o].id == touch.identifier) {
					touchobj = touchobjs[o];
					break;
				}
			}
			if (!touchobj) {
				console.error("missing touch obj?");
				continue;
			}
			updatedrag(touchobj, touch.pageX, touch.pageY);
		}
	});
	function endtouch(ev) {
		ev.preventDefault();
		var touches = ev.changedTouches;
		for (var i = 0; i < touches.length; ++i) {
			var touch = touches[i];
			var touchobj = null;
			for (var o = 0; o < touchobjs.length; ++o) {
				if (touchobjs[o].id == touch.identifier) {
					stopdrag(touchobjs[o]);
					touchobjs.splice(o,1);
					break;
				}
			}
		}
	}
	window.addEventListener('touchend', endtouch);
	window.addEventListener('touchcancel', endtouch);
}
