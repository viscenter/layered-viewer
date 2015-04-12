(function() {
    // Default image set json file location
    var DEF_IMAGE_SET = '/test/data/test.json';
    // page index to start with
    var DEF_PAGE_IDX = 0;
    // layer of page for primary layer
    var DEF_PRIMARY_IDX = 1;
    // layer of page for secondary layer
    var DEF_SECONDARY_IDX = 0;

    // OpenSeadragon (OSD) initialization settings
    var OSD_PREFIX_URL = '/external/openseadragon/images/';
    var SHOW_NAV = false;
    // disable OSD animations since second canvas lags behind and it
    // looks bad
    var ANIMATION_TIME = 0;

    // clipSize can be radius or side length
    var cursor = {clipSize: 50,
		  isCircle: true};
    
    // read in JSON which defines image set structure and locations of
    // images in the set
    var pages = $.parseJSON(
	$.ajax(
	    {
		url: DEF_IMAGE_SET,
		// necessary to make sure we wait for this to load
		// before moving on
		async: false,
		dataType: 'json'
	    }
	).responseText
    )['pages'];

    // Initialize an OSD instance for the foreground.  
    var primary = OpenSeadragon({
	id: 'primary',
	prefixUrl: OSD_PREFIX_URL,
	tileSources: pages[DEF_PAGE_IDX]['entries'][DEF_PRIMARY_IDX]['dzi'],
	showNavigator: SHOW_NAV,
	animationTime: ANIMATION_TIME
    });

    // Initialize an OSD instance for the background.
    var secondary = OpenSeadragon({
	id: 'secondary',
	prefixUrl: OSD_PREFIX_URL,
	tileSources: pages[DEF_PAGE_IDX]['entries'][DEF_SECONDARY_IDX]['dzi'],
	showNavigator: SHOW_NAV,
	animationTime: ANIMATION_TIME
    });

    // The primary OSD instance is going to be overlayed on top of the
    // seconday OSD instance. So it is going to be catching all user
    // input.

    // Every time the user pans on the primary OSD, pan to the same
    // position on the secondary OSD instance.
    primary.addHandler('pan', function (e) {
	if (primary && secondary) {
	    if (secondary.viewport)
		secondary.viewport.panTo(primary.viewport.getCenter(false));
	}
    });

    // Similar for zoom. Every time the user zooms on the primary OSD,
    // zoom to the same position on the secondary client.
    primary.addHandler('zoom', function (e) {
	if (primary && secondary) {
	    if (secondary.viewport) {
		secondary.viewport.panTo(primary.viewport.getCenter(false));
		secondary.viewport.zoomTo(primary.viewport.getZoom(false));
	    }
	}
    });

    // The primary OSD instance's canvas is where we paint
    // transparency effects. OSD works without canvas, but our client
    // will fail if the browser does not. 
    var pc = primary.canvas.children[0];
    if (!pc) {
	console.log("Browser must support canvas for client to function.");
	console.log("Try the latest versions of Firefox or Chromium.");
	exit(0);
    }
    var ctx = pc.getContext('2d');

    // Draw a clear circle at coordinates x, y with radius size. Allow
    // us to see the background canvas.
    function clearCircle(x, y, size) {
	ctx.save();
	ctx.globalCompositeOperation = 'destination-out';
	ctx.beginPath();
	ctx.arc(x, y, size, 0, 2*Math.PI, false);
	ctx.fill();
	ctx.restore();
    }

    // Return an object containing the position of the mouse on the
    // canvas from the event e.
    function getmpos(canvas, e) {
	var rect = canvas.getBoundingClientRect();
	return { x: e.clientX - rect.left,
		 y: e.clientY - rect.top };
    }
    
    // mpos should always contain the last known position of the mouse
    // cursor on the canvas. It will be updated in the functions
    // produced by makedrawfn.
    var mpos = {};
    function makedrawfn(updatempos, refresh) {
	// updatempos should be a boolean that indicates whether the drawfn
	// returned by makedrawfn should update the mouse position.

	// refresh should be a boolean that indicates whether the
	// primary canvas should be redrawn before drawing the circle
	// or rectangle.

	// the drawfn will draw a circle if the cursor.isCircle is
	// true. Otherwise it will draw a rectangle.
	return function (e) {
	    if (primary.viewport !== undefined) {
		if (updatempos) {
		    mpos = getmpos(pc, e);
		}
		if (refresh) {
		    primary.forceRedraw();
		}
		if (cursor.isCircle) {
		    clearCircle(mpos.x,	mpos.y,	cursor.clipSize/2);
		} else {
		    ctx.clearRect((mpos.x-cursor.clipSize/2),
				  (mpos.y-cursor.clipSize/2),
				  cursor.clipSize,cursor.clipSize);
		}
	    }
	};
    }

    // redraw canvas when the mouse moves and update the mpos.
    pc.addEventListener('mousemove', makedrawfn(true, true));
    
    // when tiles are updated, redraw the cursor's circle or rectangle
    // but don't update the mouse position or redraw the canvas.
    primary.addHandler('tile-drawn', makedrawfn(false, false));
    
    // make the cursor invisible when it is over the canvas
    primary.canvas.style.cursor = 'none';

    // resize clipping on shift+mouseWheel

    $(document).on('mousewheel', function(e) {
	if (e.shiftKey) {
	    var delta = e.originalEvent.wheelDelta;

	    // make sure we do not make the size negative
	    if (!(delta < 0 && cursor.clipSize < 10)) {
		// divide delta by scale factor to make it feel right
		cursor.clipSize = Math.max(cursor.clipSize + delta / 5, 10);
	    }
	    // don't force the canvas to redraw itself and don't
	    // update the mouse position.
	    makedrawfn(false, false)({});
	}
	return false;
    });

    // on window resize, make sure to redraw everything so that the
    // sizes of the two canvases are in sync
    $(window).resize(function () {
	// the below code (commented out) does not work as I would
	// expect [Stephen] but this event does fire on a window
	// resize so it can be used to fix the resize issues

	// if (primary && secondary) {
	//     if (secondary.viewport) {
	// 	secondary.viewport.panTo(primary.viewport.getCenter(false));
	// 	secondary.viewport.zoomTo(primary.viewport.getZoom(false));
	//     }
	// }
	// makedrawfn(true, true);
    });

    // handle keypresses
    $(document).keydown(function (e) {
	switch (e.which) {
	case 67: // c
	    // change cursor shape from circle <=> square
	    cursor.isCircle = !cursor.isCircle;
	    // force the client to redraw itself but don't update the
	    // mouse position. Pass null because the drawfn does not
	    // need to receive an event, which would normally be used
	    // if the mouse position changed.
	    makedrawfn(false, true)(null);
	    break;
	default:
	    return;
	}
    });

}());
