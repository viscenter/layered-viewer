// Authors: John Walker, Stephen Parsons, Thomas Loy

// The primary functionality of the viewer is implemented here. This
// file parses the image set JSON file, constructs an internal
// representation of the image set, and manages the OpenSeadragon
// viewers in order to display the layers in the viewer.

(function() {
    // Default image set json file location
    var defaultImageSetJSONFile;
    // Default page index to begin with
    var defaultPageIndex;
    // Default layer index for primary viewer
    var defaultprimaryLayerIndex;
    // Default layer index for secondary viewer
    var defaultSecondaryLayerIndex;

    ////////////////////////////////////////////////////////////////////////////////
    // Initialization settings

    // On production server with Chad data available, show Chad data
    if (window.location.hostname == 'infoforest.vis.uky.edu') {
	defaultImageSetJSONFile = '/data/chad.json';
	defaultPageIndex = 223;
	defaultPrimaryLayerIndex = 4;
	defaultSecondaryLayerIndex = 2;
    } else {
	// On other machines (for development and testing, show test images
	defaultImageSetJSONFile = '/test/data/test.json';
	defaultPageIndex = 0;
	defaultPrimaryLayerIndex = 1;
	defaultSecondaryLayerIndex = 0;
    }

    // OpenSeadragon (OSD) initialization settings
    var OSDprefixURL = '/external/openseadragon/images/';
    var showNav = true;
    var showFull = false;
    var showScale = true;
    var scaleMinWidth = '75px';
    // configurable zoom limits (default from client suggestion)
    var minZoom = 0.15;
    var maxZoom = 2.00;
    // disable OSD animations since second canvas lags behind and it
    // looks bad
    var animationTime = 0;

    //
    ////////////////////////////////////////////////////////////////////////////////

    var imageSetJSONFile = defaultImageSetJSONFile;
    var pageIndex = defaultPageIndex;
    var primaryLayerIndex = defaultPrimaryLayerIndex;
    var secondaryLayerIndex = defaultSecondaryLayerIndex;

    // clipSize can be radius or side length
    var cursor = {clipSize: 50,
		  isCircle: true};
    
    // read in JSON which defines image set structure and locations of
    // images in the set
    var pages = $.parseJSON(
	$.ajax(
	    {
		url: imageSetJSONFile,
		// necessary to make sure we wait for this to load
		// before moving on
		async: false,
		dataType: 'json'
	    }
	).responseText
    )['pages'];

    // number of pages in image set
    var numPages = pages.length;
    // number of layers in current page
    var numLayers = pages[pageIndex]['layers'].length;
    
    // Initialize an OSD instance for the foreground.  
    var primary = OpenSeadragon({
	id: 'primary',
	prefixUrl: OSDprefixURL,
	tileSources: pages[pageIndex]['layers'][primaryLayerIndex]['dzi'],
	showNavigator: showNav,
	animationTime: animationTime,
	minZoomLevel: minZoom,
	maxZoomLevel: maxZoom,
	showFullPageControl: showFull,
    });

    // Initialize an OSD instance for the background.
    var secondary = OpenSeadragon({
	id: 'secondary',
	prefixUrl: OSDprefixURL,
	tileSources: pages[pageIndex]['layers'][secondaryLayerIndex]['dzi'],
	showNavigator: false,
	animationTime: animationTime,
	minZoomLevel: minZoom,
	maxZoomLevel: maxZoom,
	showFullPageControl: false,
    });

    // create and show scale/ruler
    if (showScale) {
	primary.scalebar({
	    type: OpenSeadragon.ScalebarType.MAP,
	    minWidth: scaleMinWidth,
	    pixelsPerMeter: pages[pageIndex]['layers'][primaryLayerIndex]['pixelsPerMeter'],
	    location: OpenSeadragon.ScalebarLocation.BOTTOM_LEFT,
	    xOffset: 5,
	    yOffset: 10,
	    stayInsideImage: true,
	    color: 'rgb(150, 150, 150)',
	    fontColor: 'rgb(100, 100, 100)',
	    fontSize: 'small',
	    barThickness: 2
	});
    }

    // The primary OSD instance is going to be overlayed on top of the
    // secondary OSD instance. So it is going to be catching all user
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

    primary.addViewerInputHook({hooks: [
	{tracker: 'viewer', handler: 'scrollHandler', hookHandler: onScroll}
    ]});

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
		
        devicePixelRatio = window.devicePixelRatio || 1,
        backingStoreRatio = ctx.webkitBackingStorePixelRatio ||
                            ctx.mozBackingStorePixelRatio ||
                            ctx.msBackingStorePixelRatio ||
                            ctx.oBackingStorePixelRatio ||
                            ctx.backingStorePixelRatio || 1,

        ratio = devicePixelRatio / backingStoreRatio;

	
	return { x: (e.clientX - rect.left) * ratio,
		 y: (e.clientY - rect.top) * ratio };
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

    // TODO make the below update sly layer nav tool

    // The OpenSeadragon Viewer.open() method is asynchronous and we have to
    // wait for it to complete before we can pan/zoom the new image to the
    // old pan/zoom settings. There is certainly a cleaner way to do this
    // if we get around to it.
    var updateDelay = 50;

    // After the primary layer index has been changed, update the primary
    // viewer to reflect this change.
    function updatePrimaryImage() {
	var zoom = primary.viewport.getZoom(false);
	var pan = primary.viewport.getCenter(false);
	primary.open(pages[pageIndex]['layers'][primaryLayerIndex]['dzi']);
	setTimeout(function() {
	    primary.viewport.zoomTo(zoom);
	    primary.viewport.panTo(pan);
	}, updateDelay);
    }

    // After the secondary layer index has been changed, update the secondary
    // viewer to reflect this change.
    function updateSecondaryImage() {
	var zoom = secondary.viewport.getZoom(false);
	var pan = primary.viewport.getCenter(false);
	secondary.open(pages[pageIndex]['layers'][secondaryLayerIndex]['dzi']);
	setTimeout(function() {
	    secondary.viewport.zoomTo(zoom);
	    secondary.viewport.panTo(pan);
	}, updateDelay);
    }

    // After the page index has been changed, update both the primary and
    // secondary viewers to reflect this change.
    // TODO if the new page has fewer layers, reduce the layer indices
    function updatePage() {
	// If we are currently at a layer index that does not exist in the
	// new page, we must update the index to be in range of the layers
	// in the new page.
	primaryLayerIndex = Math.min(primaryLayerIndex,
				     pages[pageIndex]['layers'].length - 1);
	secondaryLayerIndex = Math.min(secondaryLayerIndex,
				       pages[pageIndex]['layers'].length - 1);
	updatePrimaryImage();
	updateSecondaryImage();
	fillSlider();
    }

    // redraw canvas when the mouse moves and update the mpos.
    pc.addEventListener('mousemove', makedrawfn(true, true));
    
    // when tiles are updated, redraw the cursor's circle or rectangle
    // but don't update the mouse position or redraw the canvas.
    primary.addHandler('tile-drawn', makedrawfn(false, false));
    
    // make the cursor invisible when it is over the canvas
    primary.canvas.style.cursor = 'none';

    // resize clipping on shift+mouseWheel
    function onScroll(e) {
	if (shiftDown) {
	    // configurable min and max sizes for clipping region
	    var minClipSize = 10;
	    var maxClipSize = 1000;
	    // prevent the OpenSeadragon viewer from trying to scroll
	    e.preventDefaultAction = true;
	    // divide delta by scale factor to make it feel right
	    var delta = e.originalEvent.wheelDelta / 5;

	    // make sure we do not make the size outside the min and max
	    var newClipSize = cursor.clipSize + delta;
	    if (newClipSize >= minClipSize && newClipSize <= maxClipSize) {
		cursor.clipSize = newClipSize;
	    }

	    // don't force the canvas to redraw itself and don't
	    // update the mouse position.
	    makedrawfn(false, false)({});
	}
    }
    
    // Generic function to wait for the final call of something. In this
    // case we use this to resync the pan and zoom only once after the
    // window has finished resizing.
    var waitForFinalEvent = (function () {
	var timers = {};
	return function (callback, ms, uniqueId) {
	    if (!uniqueId) {
		uniqueId = "Don't call this twice without a uniqueId";
	    }
	    if (timers[uniqueId]) {
		clearTimeout (timers[uniqueId]);
	    }
	    timers[uniqueId] = setTimeout(callback, ms);
	};
    })();

    // on window resize, make sure to redraw everything so that the
    // sizes of the two canvases are in sync
    $(window).resize(function (e) {
	// A hardcoded delay is used here which is not ideal. This creates
	// a small flicker but it is an improvement from before, when the
	// viewers simply did not resync after a window resize.
	waitForFinalEvent(function () {
	    secondary.viewport.panTo(primary.viewport.getCenter(false));
	    secondary.viewport.zoomTo(primary.viewport.getZoom(false));
	}, 50, "resize");
    });

    // Keep track of whether or not the shift key is down (used for
    // mouse scroll to resize clipping region).
    var shiftDown = false;

    // handle keypresses
    $(document).keyup(function (e) {
	switch (e.which) {
	case 16: // shift
	    shiftDown = false;
	    break;
	default:
	    return;
	}
    });

    $(document).keydown(function (e) {
	switch (e.which) {
	case 16: // shift
	    shiftDown = true;
	    break;
	case 67: // c
	    // change cursor shape from circle <=> square
	    cursor.isCircle = !cursor.isCircle;
	    // force the client to redraw itself but don't update the
	    // mouse position. Pass null because the drawfn does not
	    // need to receive an event, which would normally be used
	    // if the mouse position changed.
	    makedrawfn(false, true)(null);
	    break;

	case 73: // i
	    // increment secondary layer index
	    secondaryLayerIndex = (secondaryLayerIndex + 1) % numLayers;
	    updateSecondaryImage();
	    break;

	case 74: // j
	    // decrement primary layer index
	    primaryLayerIndex = (primaryLayerIndex - 1 + numLayers) % numLayers;
	    updatePrimaryImage();
	    break;

	case 75: // k
	    // decrement secondary layer index
	    secondaryLayerIndex = (secondaryLayerIndex - 1 + numLayers) % numLayers;
	    updateSecondaryImage();
	    break;

	case 76: // l
	    // increment primary layer index
	    primaryLayerIndex = (primaryLayerIndex + 1) % numLayers;	    
	    updatePrimaryImage();
	    break;

	case 77: // m
	    // increment page index
	    pageIndex = (pageIndex + 1) % numPages;
	    updatePage();
	    break;

	case 78: // n
	    // decrement page index
	    pageIndex = (pageIndex - 1 + numPages) % numPages;
	    updatePage();
	    break;

	case 79: // o
	    // expand clipping region
	    break;

	case 85: // u
	    // reduce clipping region
	    break;

	default:
	    return;
	}
    });

    // fill slider with names of each layer
    function fillSlider() {
	$(".slidee").empty();
	for(i=0; i < numLayers; i++)
	{
	    version = pages[pageIndex]['layers'][i]['version'];
	    var elem = '';
	    if (i == pageIndex) {
		elem = '<li id="'+i+'" class="active">'+version+'</li>';
	    } else {
		elem = '<li id="'+i+'">'+version+'</li>';
	    }
	    $('#frame').sly('add', elem);
	}
    }

    //sly code
    $(function ($) {
	$('#frame').sly({
	    horizontal: 1,
	    
	    itemNav: 'forceCentered',
	    smart: 1,
	    activateOn: 'click',
	    
	    scrollBy: 1,
	    
	    mouseDragging: 1,
	    swingSpeed: 0.2,
	    
	    scrollBar: $('.scrollbar'),
	    dragHandle: 1,
	    
	    speed: 600,
	    startAt: 2
	});
    });

    $(document).ready(fillSlider);
}());

