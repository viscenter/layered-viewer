(function() {
    var primary = OpenSeadragon({
        id: "primary",
        prefixUrl: "/external/openseadragon/images/",
        tileSources: "/test/data/color.dzi",
        showNavigator: false
    });
    var secondary = OpenSeadragon({
        id: "secondary",
        prefixUrl: "/external/openseadragon/images/",
        tileSources: "/test/data/grey.dzi",
        showNavigator: false
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
    var mpos = {};
    var pc = primary.canvas.children[0];
    var ctx = pc.getContext("2d");

    function getmpos(canvas, e) {
        var rect = canvas.getBoundingClientRect();
        return { x: e.clientX - rect.left,
		 y: e.clientY - rect.top };
    }
    pc.addEventListener('mousemove', function (e) {
        mpos = getmpos(pc, e);
        if (primary.viewport != undefined) {
            primary.forceRedraw();
            ctx.clearRect(mpos.x,mpos.y, 50,50);
        }
    });
    primary.addHandler('tile-drawn', function (e) {
        ctx.clearRect(mpos.x,mpos.y,50,50);
    });
}());
