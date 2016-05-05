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
    defaultImageSetJSONFile = 'data/test/test.json';
    defaultPageIndex = 0;
    defaultPrimaryLayerIndex = 0;
    defaultSecondaryLayerIndex = 1;
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

// clipSize can be radius or side length
var cursor = {clipSize: 500,
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
    navigatorMaintainSizeRatio: true,
    animationTime: animationTime,
    minZoomLevel: minZoom,
    maxZoomLevel: maxZoom,
    showFullPageControl: false,
    showNavigationControl: false,
    zoomPerScroll: 1.1,
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
    {tracker: 'viewer', handler: 'scrollHandler', hookHandler: onViewerScroll}
]});

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
setInterval(validate, 1);
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
  this.handle = '';
};

// OSD img coords are between 0 and bounds.w/h, not 0-1
// Convert our 0-1 value to 0-bounds value
Flashlight.prototype.boundsPosition = function() {
    var primaryImg = primary.world.getItemAt(0);
    var bounds = primaryImg.getBounds();
    return new OpenSeadragon.Point(this.x * bounds.width, this.y * bounds.height);
};

// Return the position of the flashlight in canvas coords
Flashlight.prototype.canvasPosition = function() {
    var primaryImg = primary.world.getItemAt(0);
    var center = primary.viewport.getCenter();
    var scale = primaryImg.viewport.getZoom();

    // get 0-bounds position
    var flash_pos = this.boundsPosition();

    // Get the offset from the pt at the center of the canvas
    // Both values are in img coords
    var offset = flash_pos.minus(center);

    // Scale the offset by the zoom level
    offset = offset.times(scale);

    // Convert the offset to canvas pixel coords
    offset = offset.times(pc.width, pc.height);

    // Find the xy position of the pt in canvas coords
    var position = new OpenSeadragon.Point(pc.width/2, pc.height/2);
    return position.plus(offset);
};

// Adds a clipping flashlight to the viewer
function addFlashlight(x, y, s) {
  var light = new Flashlight;
  light.x = x;
  light.y = y;
  light.clipSize = s;
  addHandle(flashlights.length, light);
  flashlights.push(light);
  invalidate();
};

function addHandle(index, flashlight) {
  // setup
  var h_pos = flashlight.boundsPosition();

  var h_element = document.createElement("div");
  h_element.id = "handle-" + index;
  $(h_element).addClass("circle handle");

  // add to the OSD instance
  primary.addOverlay({
    element: h_element,
    location: h_pos,
    checkResize: false
  });

  // add handler for click events
  new OpenSeadragon.MouseTracker({
    element: h_element.id,
    pressHandler: onHandlePress,
    releaseHandler: onHandleRelease,
    dragHandler: onHandleDrag
  });

  // add ref back to flashlight
  flashlight.handle = h_element;
}

// Handle the click event on the flashlight handles
function onHandlePress(e) {
  whichFlashlight = e.eventSource.element.id.split("-")[1];
  $("#primary").css('cursor', '-webkit-grabbing');
  $("#handle-"+whichFlashlight).css('cursor', '-webkit-grabbing');
  primary.zoomPerScroll = 1;
};

// Handle the drag event on the flashlight handles
function onHandleDrag(e) {
    e.preventDefaultAction = true;
    e.stopBubbling = true;

    // Get the drag delta in viewport pixels
    var delta = new OpenSeadragon.Point(e.delta.x * OpenSeadragon.pixelDensityRatio, e.delta.y * OpenSeadragon.pixelDensityRatio);

    // Convert the delta to an offset in canvas relative coords
    var offset = delta.divide(pc.width, pc.height);

    // Scale the offset based on the zoom level
    var scale = primary.viewport.getZoom();
    offset = offset.divide(scale);

    // Convert the 0-bounds offset to 0-1
    var bounds = primary.world.getItemAt(0).getBounds();
    offset.x = offset.x / bounds.width;
    offset.y = offset.y / bounds.height;

    // Add the offset to the position value
    flashlights[whichFlashlight].x += offset.x;
    flashlights[whichFlashlight].y += offset.y;

    invalidate();
};

// Handle the flashlight handle release event
function onHandleRelease(e) {
  $("#primary").css('cursor', "");
  $("#handle-"+whichFlashlight).css('cursor', '-webkit-grab');
  primary.zoomPerScroll = 1.1;
  whichFlashlight = null;
  invalidate();
}

// Clear the special effects from the context once we're done with them
// If these are cleared, every element drawn into the context from now on
// will have these effects.
function resetContext( context ) {
  context.globalAlpha = 1;
  context.shadowOffsetX = 0;
  context.shadowOffsetY = 0;
  context.shadowBlur = 0;
}

// Iterate over the list of flashlights and draw each one onto the canvas.
function drawFlashlights() {
  for ( var i = 0; i < flashlights.length; i++ ) {
    if (cursor.isCircle) {
      cutCircle(flashlights[i].canvasPosition().x, flashlights[i].canvasPosition().y, flashlights[i].clipSize/2);
    } else {
      cutSquare(flashlights[i].canvasPosition().x, flashlights[i].canvasPosition().y, flashlights[i].clipSize);
    };
    if (!($('#'+flashlights[i].handle.id).length))
      addHandle(i, flashlights[i]);
    else {
      primary.currentOverlays[i].update(flashlights[i].boundsPosition());
      primary.currentOverlays[i].drawHTML(primary.overlaysContainer, primary.viewport);
    }
  };
}

// Draw a clear circle at coordinates x, y with radius size. Allow
// us to see the background canvas.
function cutCircle(x, y, radius) {
    radius = radius * primary.viewport.getZoom();

    ctx.save();
    ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, 2*Math.PI, false);
    ctx.fill();
    ctx.restore();
};

// Draw a clear square at coordinates x, y with sides of length.
function cutSquare(x, y, length) {
    length = length * primary.viewport.getZoom();
    ctx.clearRect(x-length/2, y-length/2, length, length);
};

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
    primary.viewport.zoomTo(zoom, true);
    primary.viewport.panTo(pan, true);
    }, updateDelay);
};

// After the secondary layer index has been changed, update the secondary
// viewer to reflect this change.
function updateSecondaryImage() {
    var zoom = primary.viewport.getZoom(false);
    var pan = primary.viewport.getCenter(false);
    secondary.open(pages[pageIndex]['layers'][secondaryLayerIndex]['dzi']);
    setTimeout(function() {
    secondary.viewport.zoomTo(zoom, true);
    secondary.viewport.panTo(pan, true);
    }, updateDelay);
};

// Fill the Page Selector with the currently active page
function updateSearchBar() {
    $("#page-id")[0].value = pages[pageIndex].name;
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
    if (e.shift) {
      // configurable min and max sizes for clipping region
      // To-Do: these values are image dependent
      var minClipSize = 15;
      var maxClipSize = primary.world.getItemAt(0).getContentSize().y;
      // prevent the OpenSeadragon viewer from trying to scroll
      e.preventDefaultAction = true;
      // divide delta by scale factor to make it feel right
      var delta = e.originalEvent.wheelDelta / 5;

      // make sure we do not make the size outside the min and max
      // To-Do: Make this work if there are multiple flashlights
      var newClipSize = flashlights[0].clipSize + delta;
      if (newClipSize < minClipSize) {
        flashlights[0].clipSize = minClipSize;
      } else if (newClipSize > maxClipSize) {
        flashlights[0].clipSize = maxClipSize;
      } else {
        flashlights[0].clipSize = newClipSize;
      };
    invalidate();
    };
};

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
    invalidate();
    }, 50, "resize");
});

// Keep track of whether or not the shift key is down (used for
// mouse scroll to resize clipping region).
var shiftDown = false;

// handle keypresses
$(document).keyup(function (e) {
    switch (e.which) {
    default:
    return;
    }
});

$(document).keydown(function (e) {
    switch (e.which) {
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

// Handle the user selecting a new primary layer from the slidee
sly.on('active', function (eventName, itemIndex) {
    if (primaryLayerIndex !== itemIndex) {
        primaryLayerIndex = itemIndex;
        updatePrimaryImage();
    }
});

// Initialize sly
sly.init();

// Reload sly if the window is resized
$(window).resize(function(e) {
    sly.reload();
});

// Fills the slider with the names of each layer
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

// Fills the Page Selector with the names of each page
function fillPageSelector() {
    var elem = '';
    for ( id=0; id < pageNames().length; id++ ) {
      elem = '<li class="page-item" id="'+id+'" onclick="gotoPage('+id+')">'+pageNames()[id]+'</li>';
      $("#page-list").append(elem);
    }
}

// Update the slider to indicate the active secondary layer
function updateSecondaryCard() {
  var old = $("#slidee").find(".second-active");
  old.removeClass("second-active");
  old.find("span").find(".circle.indicator").remove();

  var elem = '<div class="circle indicator"></div>'
  var newSecond = $("#slidee").find("#" + secondaryLayerIndex);
  newSecond.addClass("second-active");
  newSecond.find("span").prepend(elem);
}

// Show or hide the Layer Selector
function toggleLayerSelector() {
  if( $("#layer-selector").css("display") == 'none' ) {
    $("#layer-selector-toggle").animate(
      {"margin-bottom": "10px"},
      {
        step: function(now,fx) {
          var deg = -((now-10)*180)/(20);
          $(this).find("iron-icon").css("-ms-transform", "rotate("+deg+"deg)");
          $(this).find("iron-icon").css("-webkit-transform", "rotate("+deg+"deg)");
          $(this).find("iron-icon").css("transform", "rotate("+deg+"deg)");
        }
      },
      400 );
  } else {
    $("#layer-selector-toggle").animate(
      {"margin-bottom": "30px"},
      {
        step: function(now,fx) {
          var deg = ((now-10)*180)/(20);
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

// Special animations for the layer selector and help buttons
$("#layer-selector-fab").mouseenter( function() {
  $("#layer-selector-label").animate( {"opacity": "1.0"}, "fast" );
});

$("#layer-selector-fab").mouseleave( function() {
  $("#layer-selector-label").animate( {"opacity": "0.0"}, "fast" );
});

$("#help-fab").mouseenter( function() {
  $("#help-label").animate( {"opacity": "1.0"}, "fast" );
});

$("#help-fab").mouseleave( function() {
  $("#help-label").animate( {"opacity": "0.0"}, "fast" );
});

// Start the help dialog if the help button is clicked
$("#help-fab").click(function(){
  if (Shepherd.activeTour == null) {
    primary.setMouseNavEnabled(false);
    $(".navigator").hide();
    $("#help-dialog-wrapper").slideToggle();
  }
});

// Start the tour if it's clicked in the help page
$("#help-close").click(onHelpClose);
$("#help-confirm").click(onHelpConfirm);

function onHelpConfirm() {
  $("#help-dialog-wrapper").slideToggle(400, startTour);
};

// Re-enable the navigator and mouse functionality once the help box is closed
function onHelpClose() {
  primary.setMouseNavEnabled(true);
  $(".navigator").show();
  $("#help-dialog-wrapper").slideToggle();
}

function usingChrome() {
  return navigator.userAgent.toLowerCase().indexOf('chrome') > -1;
}

function showWarning() {
  $("#browser-warning").css("display", "block");
}

// Show the page selector when you click on the Page ID in the nav bar
$("#page-id").focusin(function() {
    $("#page-list").slideDown(200);
});

// Hide the page selector when you unclick the Page ID in the nav bar
$("#page-id").focusout(function() {
    $("#page-list").delay(50).slideUp(200);
});

// Setup everything when the viewer loads
$(window).load( function () {
    fillSlider();
    fillPageSelector();
    sly.activate(primaryLayerIndex);
    updateSecondaryCard();
    updateSearchBar();
    sly.reload();
    setTimeout(function(){
      addFlashlight(0.5, 0.5, cursor.clipSize)},
    500);
    $("#help-fab").click();
});
