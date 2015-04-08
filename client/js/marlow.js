(function() {
    var cursor = {width: 50,
                  height: 50};

    var primary = OpenSeadragon({
        id: "primary",
        prefixUrl: "/external/openseadragon/images/",
        tileSources: "/test/data/color.dzi",
        showNavigator: false,
        animationTime: 0
    });

    var secondary = OpenSeadragon({
        id: "secondary",
        prefixUrl: "/external/openseadragon/images/",
        tileSources: "/test/data/grey.dzi",
        showNavigator: false,
        animationTime: 0
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
        }
    }

    pc.addEventListener('mousemove', drawopacity(true, true));
    primary.addHandler('tile-drawn', drawopacity(false, false));
    primary.canvas.style.cursor = "none";
}());
