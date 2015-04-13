(function() {
    // Default image set json file location
    var DEF_IMAGE_SET = '/test/data/test.json';
    // page index to start with
    var DEF_PAGE_IDX = 0;
    // layer of page for primary layer
    var DEF_PRIMARY_IDX = 1;
    // layer of page for secondary layer
    var DEF_SECONDARY_IDX = 0;

    // OpenSeadragon initialization settings
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


    var primary = OpenSeadragon({
	id: 'primary',
	prefixUrl: OSD_PREFIX_URL,
	tileSources: pages[DEF_PAGE_IDX]['entries'][DEF_PRIMARY_IDX]['dzi'],
	showNavigator: SHOW_NAV,
	animationTime: ANIMATION_TIME
    });

    var secondary = OpenSeadragon({
	id: 'secondary',
	prefixUrl: OSD_PREFIX_URL,
	tileSources: pages[DEF_PAGE_IDX]['entries'][DEF_SECONDARY_IDX]['dzi'],
	showNavigator: SHOW_NAV,
	animationTime: ANIMATION_TIME
    });

    primary.addHandler('pan', function (e) {
	if (primary && secondary) {
	    if (secondary.viewport)
		secondary.viewport.panTo(primary.viewport.getCenter(false));
	}
    });

    primary.addHandler('zoom', function (e) {
	if (primary && secondary) {
	    if (secondary.viewport) {
		secondary.viewport.panTo(primary.viewport.getCenter(false));
		secondary.viewport.zoomTo(primary.viewport.getZoom(false));
	    }
	}
    });

    var pc = primary.canvas.children[0];
    var ctx = pc.getContext('2d');

  


    function clearCircle(x, y, size) {
	ctx.save();
	ctx.globalCompositeOperation = 'destination-out';
	ctx.beginPath();
	ctx.arc(x, y, size, 0, 2*Math.PI, false);
	ctx.fill();
	ctx.restore();
    }

    function getmpos(canvas, e) {
	var rect = canvas.getBoundingClientRect();
	return { x: e.clientX - rect.left,
		 y: e.clientY - rect.top };
    }

    var mpos = {};
    function drawopacity(updatempos, refresh) {
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

    // redraw canvas when things change
    pc.addEventListener('mousemove', drawopacity(true, true));
    primary.addHandler('tile-drawn', drawopacity(false, false));
    
    // cursor need not be visible over canvas
    primary.canvas.style.cursor = 'none';

    // resize clipping on shift+mouseWheel
    $(document).on('mousewheel', function(event) {
	if (event.shiftKey) {
	    var delta = event.originalEvent.wheelDelta;

	    // make sure we do not make the size negative
	    if (!(delta < 0 && cursor.clipSize < 10)) {
		// divide delta by scale factor to make it feel right
		cursor.clipSize = Math.max(cursor.clipSize + delta / 5, 10);
	    }

	    drawopacity(true, true);
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
	// drawopacity(true, true);
    });

    // handle keypresses
    $(document).keydown(function (event) {
	switch (event.which) {
	case 67: // c
	    // change cursor shape from circle <=> square
	    cursor.isCircle = !cursor.isCircle;
	    drawopacity(true, true);
	    break;
	default:
	    return;
	}
    });


//fills sliders with names of each dzi.

// tracker for number of pages in layer
var numPages = pages[DEF_PAGE_IDX]['entries'].length;

$(document ).ready(function fillSlider() {

  for(i=0;i < numPages;i++)
  {

    $(".slidee").append('<li><div class="thumbnail"  id="' + i + '" "style="overflow:hidden"><p>'+pages[DEF_PAGE_IDX]['entries'][i]['dzi']+'</p></div></li>');


  }
  

});



}());


//sly code



jQuery(function ($) {

  
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

