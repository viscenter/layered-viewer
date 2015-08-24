// Authors: John Walker, Stephen Parsons, Thomas Loy

// The primary functionality of the viewer is implemented here. This
// file parses the image set JSON file, constructs an internal
// representation of the image set, and manages the OpenSeadragon
// viewers in order to display the layers in the viewer.


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
    defaultImageSetJSONFile = 'data/chad.json';
    defaultPageIndex = 223;
    defaultPrimaryLayerIndex = 4;
    defaultSecondaryLayerIndex = 2;
} else {
    // On other machines (for development and testing, show test images
    defaultImageSetJSONFile = 'test/data/test.json';
    defaultPageIndex = 2;
    defaultPrimaryLayerIndex = 2;
    defaultSecondaryLayerIndex = 0;
}

// OpenSeadragon (OSD) initialization settings
var OSDprefixURL = 'external/openseadragon/images/';
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

// Is a flashlight moving and which one?
var movingFlashlight = false;
var whichFlashlight = null;
var flashlightIndicatorSize = 7;
var mouse_offset = {x: 0, y: 0};

// clipSize can be radius or side length
var cursor = {clipSize: 50,
          isCircle: true};

// read in JSON which defines image set structure and locations of
// images in the set
var json = $.ajax({
        url: imageSetJSONFile,
        // necessary to make sure we wait for this to load
        // before moving on
        async: false,
        dataType: 'json'
    }).responseText;

var pages = $.parseJSON(json)['pages'];

// number of pages in image set
var numPages = pages.length;
// number of layers in current page
var numLayers = pages[pageIndex]['layers'].length;
// returns an array of the names of pages from pages[]
function pageNames() {
    array = pages.map(function(obj) {return obj.name;});
    return array;
};

// Initialize an OSD instance for the foreground.
var primary = OpenSeadragon({
    id: 'primary',
    prefixUrl: OSDprefixURL,
    tileSources: pages[pageIndex]['layers'][primaryLayerIndex]['dzi'],
    showNavigator: showNav,
    navigatorID: "navigator-wrapper",
    animationTime: animationTime,
    minZoomLevel: minZoom,
    maxZoomLevel: maxZoom,
    showFullPageControl: false,
    showNavigationControl: false,
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
    showNavigationControl: false,
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
    color: 'rgba(255, 255, 255, .75)',
    fontColor: 'rgba(255, 255, 255, .75)',
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
    };
    invalidate();
});

// Similar for zoom. Every time the user zooms on the primary OSD,
// zoom to the same position on the secondary client.
primary.addHandler('zoom', function (e) {
    if (primary && secondary) {
      if (secondary.viewport) {
          secondary.viewport.panTo(primary.viewport.getCenter(false));
          secondary.viewport.zoomTo(primary.viewport.getZoom(false));
      };
    };
    invalidate();
});

primary.addViewerInputHook({hooks: [
    {tracker: 'viewer', handler: 'scrollHandler', hookHandler: onViewerScroll},
    {tracker: 'viewer', handler: 'pressHandler', hookHandler: onViewerPress},
    {tracker: 'viewer', handler: 'releaseHandler', hookHandler: onViewerRelease},
    {tracker: 'viewer', handler: 'dragHandler', hookHandler: onViewerDrag}
]});

// Set the initial page name info
updateSearchBar();

// Functions for custom control elements
function resetView() {
    primary.viewport.goHome();
    secondary.viewport.goHome();
};

function zoomOut() {
    primary.viewport.zoomBy(0.8);
};

function zoomIn() {
    primary.viewport.zoomBy(1.2);
};

function prevPage() {
    if ( pageIndex !== 0 ) {
        pageIndex = (pageIndex - 1 + numPages) % numPages;
    } else {
        pageIndex = numPages - 1;
    };
    updatePage();
};

function nextPage() {
    if ( pageIndex !== numPages - 1 ) {
        pageIndex = (pageIndex + 1) % numPages;
    } else {
        pageIndex = 0;
    }
    updatePage();
};

function gotoPage(index) {
    pageIndex = index;
    updatePage();
};

// The primary OSD instance's canvas is where we paint
// transparency effects. OSD works without canvas, but our client
// will fail if the browser does not.
var pc = primary.canvas.children[0];
if (!pc) {
    console.log("Browser must support canvas for client to function.");
    console.log("Try the latest versions of Firefox or Chromium.");
    exit(0);
};
var ctx = pc.getContext('2d');

// interval for refreshing the view
setInterval(validate, 10);
isValid = false;

function invalidate() { isValid = false };

function validate() {
  if ( isValid == false ) {
    // Clear the canvas. This action triggers "tile-drawn", which in turn redraws flashlights
    primary.forceRedraw();
    isValid = true;
  };
};

// when tiles are updated, redraw all of the flashlights
// this ensures that flashlights are always drawn AFTER the canvas finishes updating
primary.addHandler('tile-drawn', drawFlashlights);

// Holds all flashlights
var flashlights = [];

// Flashlight object
function Flashlight() {
  this.x = 0;
  this.y = 0;
  this.clipSize = 10;
  this.fill = 'white';
};

function addFlashlight(x, y, s) {
  var light = new Flashlight;
  light.x = x;
  light.y = y;
  light.clipSize = s;
  flashlights.push(light);
  invalidate();
};

function drawIndicator(flashlight, color, context) {
  context.beginPath();
  context.arc(flashlight.x, flashlight.y, flashlightIndicatorSize, 0, 2 * Math.PI, false);
  context.fillStyle = color;
  context.fill();
};

function drawFlashlights() {
  for ( var i = 0; i < flashlights.length; i++ ) {
    if (cursor.isCircle) {
      cutCircle(flashlights[i].x, flashlights[i].y, flashlights[i].clipSize/2);
    } else {
      cutSquare(flashlights[i].x, flashlights[i].y, flashlights[i].clipSize);
    };
    drawIndicator( flashlights[i], flashlights[i].fill, ctx);
  };
}

// Draw a clear circle at coordinates x, y with radius size. Allow
// us to see the background canvas.
function cutCircle(x, y, radius) {
    ctx.save();
    ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, 2*Math.PI, false);
    ctx.fill();
    ctx.restore();
};

// Draw a clear square at coordinates x, y with sides of length.
function cutSquare(x, y, length) {
    ctx.clearRect(x-length/2, y-length/2, length, length);
};

// ghost canvas that we use to detect if a flashlight has been clicked
var ghostcanvas;
var ghostctx;
function makeGhostCanvas() {
  ghostcanvas = document.createElement('canvas');
  ghostcanvas.width = pc.width;
  ghostcanvas.height = pc.height;
  ghostctx = ghostcanvas.getContext('2d');
};

function clearGhostCanvas() {
  ghostctx.clearRect(0, 0, ghostcanvas.width, ghostcanvas.height);
}

// return true if the given position is on top of a flashlight indicator
// if true, whichFlashlight is set to the index number of the flashlight in flashlights[]
// if false, whichFlashlight is set to null
function getIndicatorClicked(position) {
  clearGhostCanvas();

  for ( var i = 0; i < flashlights.length; i++ ) {
    drawIndicator( flashlights[i], 'black', ghostctx);

    var imageData = ghostctx.getImageData(position.x, position.y, 1, 1);
    if ( imageData.data[3] > 0){
      whichFlashlight = i;
      return true;
    }

    clearGhostCanvas();
  }
  whichFlashlight = null;
  return false;
}

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
};

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
};

function updateSearchBar() {
    pageID.value = pages[pageIndex].name;
};

// After the page index has been changed, update both the primary and
// secondary viewers to reflect this change.
function updatePage() {
    // If we are currently at a layer index that does not exist in the
    // new page, we must update the index to be in range of the layers
    // in the new page.
    numLayers = pages[pageIndex]['layers'].length;
    primaryLayerIndex = Math.min(primaryLayerIndex,
                 numLayers - 1);
    secondaryLayerIndex = Math.min(secondaryLayerIndex,
                 numLayers - 1);
    updatePrimaryImage();
    updateSecondaryImage();
    updateSearchBar();
    fillSlider();
    sly.activate(primaryLayerIndex);
    updateSecondaryCard();
}

// resize clipping on shift+mouseWheel
function onViewerScroll(e) {
    if (shiftDown) {
      // configurable min and max sizes for clipping region
      var minClipSize = 10;
      var maxClipSize = 1000;
      // prevent the OpenSeadragon viewer from trying to scroll
      e.preventDefaultAction = true;
      // divide delta by scale factor to make it feel right
      var delta = e.originalEvent.wheelDelta / 5;

      // make sure we do not make the size outside the min and max
      var newClipSize = flashlights[0].clipSize + delta;
      if (newClipSize >= minClipSize && newClipSize <= maxClipSize) {
          flashlights[0].clipSize = newClipSize;
      };
    };
    invalidate();
};

function onViewerPress(e) {
  if ( getIndicatorClicked(e.position) ) {
    e.preventDefaultAction = true;
    e.stopBubbling = true;

    mouse_offset.x = e.position.x - flashlights[whichFlashlight].x;
    mouse_offset.y = e.position.y - flashlights[whichFlashlight].y;
    movingFlashlight = true;
  };
};

function onViewerDrag(e) {
  if ( movingFlashlight ) {
    e.preventDefaultAction = true;
    e.stopBubbling = true;

    flashlights[whichFlashlight].x = e.position.x - mouse_offset.x;
    flashlights[whichFlashlight].y = e.position.y - mouse_offset.y;
    invalidate();
  };
};

function onViewerRelease(e) {
  if ( movingFlashlight ) {
    e.preventDefaultAction = true;
    e.stopBubbling = true;

    whichFlashlight = null;
    movingFlashlight = false;
    mouse_offset = {x: 0, y: 0};
  };
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
    ghostcanvas.width = pc.width;
    ghostcanvas.height = pc.height;
    ghostctx = ghostcanvas.getContext('2d');
    invalidate();
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
    invalidate();
    break;

    case 73: // i
    // increment secondary layer index
    secondaryLayerIndex = (secondaryLayerIndex + 1) % numLayers;
    updateSecondaryImage();
    updateSecondaryCard();
    break;

    case 74: // j
    // decrement primary layer index
    sly.activate((primaryLayerIndex - 1 + numLayers) % numLayers);
    break;

    case 75: // k
    // decrement secondary layer index
    secondaryLayerIndex = (secondaryLayerIndex - 1 + numLayers) % numLayers;
    updateSecondaryImage();
    updateSecondaryCard();
    break;

    case 76: // l
    // increment primary layer index
    sly.activate((primaryLayerIndex + 1) % numLayers);
    break;

    case 77: // m
    // increment page index
    nextPage();
    break;

    case 78: // n
    // decrement page index
    prevPage();
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


// Layers
// Call Sly on frame
var sly = new Sly('#frame' , {
    horizontal: 1,
    itemNav: 'forceCentered',
    smart: 1,
    activateOn: 'click',
    mouseDragging: 1,
    touchDragging: 1,
    releaseSwing: 1,
    startAt: primaryLayerIndex,
    scrollBy: 1,
    speed: 300,
    elasticBounds: 1,
    easing: 'easeOutExpo',
    dragHandle: 1,
    dynamicHandle: 1,
    clickBar: 1,
});

sly.on('active', function (eventName, itemIndex) {
    // Update the background image if we need to (e.g. the slidee is clicked)
    if (primaryLayerIndex !== itemIndex) {
        primaryLayerIndex = itemIndex;
        updatePrimaryImage();
    }
});

sly.init();

$(window).resize(function(e) {
    sly.reload();
});

// fill slider with names of each layer
function fillSlider() {
    // Empty the slider. This is the way sly wants you to do it
    cards = sly.items.length;
    for (i=0; i < cards; i++){
        sly.remove(0);
    }

    // Fill the slider
    for(i=0; i < numLayers; i++) {
        version = pages[pageIndex]['layers'][i]['version'];
        var elem = '';
        elem = '<li id="'+i+'"><paper-material class="layer-card" elevation="1"><span class="vertically-aligned">'+version+'</span></paper-material></li>';
        sly.add(elem);
    }
}

function fillPageSelector() {
    var elem = '';
    for ( id=0; id < pageNames().length; id++ ) {
      elem = '<li class="page-item" id="'+id+'" onclick="gotoPage('+id+')">'+pageNames()[id]+'</li>';
      $("#page-selector").append(elem);
    }
}

// WIP - Update the card elevations in the layer-selector toolbar
function updateCardElevation(newIndex) {
    $("#slidee").find("paper-material").attr("elevation", 1);
    var newActive = $("#" + newIndex).children("paper-material");
    if (primaryLayerIndex !== newIndex) {
        oldActive.attr("elevation", 1);
        newActive.attr("elevation", 3);
    }
}

function updateSecondaryCard() {
  var old = $("#slidee").find(".second-active");
  old.removeClass("second-active");
  old.find("span").find(".circle.indicator").remove();

  var elem = '<div class="circle indicator"></div>'
  var newSecond = $("#slidee").find("#" + secondaryLayerIndex);
  newSecond.addClass("second-active");
  newSecond.find("span").prepend(elem);
}

function toggleLayerSelector() {
  if( $("#layer-selector").css("display") == 'none' ) {
    $("#layer-selector-toggle").animate(
      {"margin-bottom": "-15px"},
      {
        step: function(now,fx) {
          var deg = -((now+15)*180)/(25);
          $(this).find("iron-icon").css("-ms-transform", "rotate("+deg+"deg)");
          $(this).find("iron-icon").css("-webkit-transform", "rotate("+deg+"deg)");
          $(this).find("iron-icon").css("transform", "rotate("+deg+"deg)");
        }
      },
      400 );
  } else {
    $("#layer-selector-toggle").animate(
      {"margin-bottom": "10px"},
      {
        step: function(now,fx) {
          var deg = ((now+15)*180)/(25);
          $(this).find("iron-icon").css("-ms-transform", "rotate("+deg+"deg)");
          $(this).find("iron-icon").css("-webkit-transform", "rotate("+deg+"deg)");
          $(this).find("iron-icon").css("transform", "rotate("+deg+"deg)");
        }
      },
      400 );
  }
  $("#layer-selector").slideToggle(400);
  sly.reload();
};

$("#layer-selector-fab").mouseenter( function() {
  $("#layer-selector-label").animate( {"opacity": "1.0"}, "fast" );
});

$("#layer-selector-fab").mouseleave( function() {
  $("#layer-selector-label").animate( {"opacity": "0.0"}, "fast" );
});

$("#help-button").mouseenter( function() {
  $("#help-label").animate( {"opacity": "1.0"}, "fast" );
});

$("#help-button").mouseleave( function() {
  $("#help-label").animate( {"opacity": "0.0"}, "fast" );
});

$("#help-button").click(function(){
  var dialog = document.getElementById("help-dialog");
  dialog.open();
});

$("#pageID").focusin(function() {
    $("#page-selector").slideDown(200);
});

$("#pageID").focusout(function() {
    $("#page-selector").delay(50).slideUp(200);
});

$(document).ready( function () {
    fillSlider();
    fillPageSelector();
    Polymer.updateStyles();
    sly.activate(primaryLayerIndex);
    updateSecondaryCard();
    makeGhostCanvas();
    addFlashlight(pc.width/2, pc.height/2, cursor.clipSize)
    //$("#help-button").click();
});
