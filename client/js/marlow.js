(function() {
    // Default image set json file location
    var DEF_IMAGE_SET = "/test/data/test.json";
    // page index to start with
    var DEF_PAGE_IDX = 0;
    // layer of page for primary layer
    var DEF_PRIMARY_IDX = 1;
    // layer of page for secondary layer
    var DEF_SECONDARY_IDX = 0;

    // OpenSeadragon initialization settings
    var OSD_PREFIX_URL = "/external/openseadragon/images/";
    var SHOW_NAV = false;
    var ANIMATION_TIME = 0;

    var cursor = {width: 50,
		  height: 50};

    var pages = $.parseJSON(
	$.ajax(
	    {
		url: DEF_IMAGE_SET,
		// necessary to make sure we wait for this to load
		async: false,
		dataType: "json"
	    }
	).responseText
    )["pages"];

    var primary = OpenSeadragon({
	id: "primary",
	prefixUrl: OSD_PREFIX_URL,
	tileSources: pages[DEF_PAGE_IDX]["entries"][DEF_PRIMARY_IDX]["dzi"],
	showNavigator: SHOW_NAV,
	animationTime: ANIMATION_TIME
    });

    var secondary = OpenSeadragon({
	id: "secondary",
	prefixUrl: OSD_PREFIX_URL,
	tileSources: pages[DEF_PAGE_IDX]["entries"][DEF_SECONDARY_IDX]["dzi"],
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
    var ctx = pc.getContext("2d");

    function getmpos(canvas, e) {
	var rect = canvas.getBoundingClientRect();
	return { x: e.clientX - rect.left,
		 y: e.clientY - rect.top };
    }

    var mpos = {};
    function drawopacity(updatempos, refresh) {
	return function (e) {
	    if (primary.viewport != undefined) {
		if (updatempos)
		    mpos = getmpos(pc, e);
		if (refresh)
		    primary.forceRedraw();
		ctx.clearRect((mpos.x-cursor.width/2),(mpos.y-cursor.height/2),cursor.width,cursor.height);
	    }
	};
    }

    pc.addEventListener('mousemove', drawopacity(true, true));
    primary.addHandler('tile-drawn', drawopacity(false, false));
    primary.canvas.style.cursor = "none";
}());
