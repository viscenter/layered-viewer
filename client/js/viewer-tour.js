var tour = new Shepherd.Tour({
  defaults: {
    classes: 'shepherd-theme-arrows',
    scrollTo: false
  }
});

tour.addStep('welcome', {
  text: "This image viewer allows you to view and compare the pages of the Chad Gospels across time."
});

backgroundText = 'The background image is showing us the page as it existed in ';
tour.addStep('background', {
    text: backgroundText,
    attachTo: '#primary left',
    tetherOptions: {
      attachment: 'middle left',
      targetAttachment: 'middle center',
      offset: '0 0'
    }
});

var flashlightText = 'The flashlight reveals the page as it existed at some other point in time. Right now, it\'s showing us what this page looked like in ';
tour.addStep('flashlight', {
    text: flashlightText,
    attachTo: '#primary left',
    tetherOptions: {
      attachment: 'middle left',
      targetAttachment: 'middle center',
      offset: '0 0'
    }
});

tour.addStep('indicator', {
    text: 'Move the flashlight by clicking and dragging this handle.',
    attachTo: '#primary left',
    tetherOptions: {
      attachment: 'middle left',
      targetAttachment: 'middle center',
      offset: '0 -' + (flashlightIndicatorSize + 10)
    },
    when: {
      show: startDemoRotation,
      hide: resetDemoRotation
    }
});

tour.addStep('resize', {
    text: 'Resize the flashlight by holding Shift and scrolling the mouse wheel.',
    attachTo: '#primary left',
    tetherOptions: {
      attachment: 'middle left',
      targetAttachment: 'middle center',
      offset: '0 -' + (flashlightIndicatorSize + 10)
    },
    when: {
      show: startDemoScroll,
      hide: resetDemoScroll
    }
});

tour.addStep('selectedPrimary', {
    text: 'The current background image is indicated in blue.',
    attachTo: '.active left',
    tetherOptions: {
      attachment: 'bottom center',
      targetAttachment: 'top center',
      offset: '-5 0'
    }
});

var idBeforeActive;
tour.addStep('changePrimary', {
    text: 'To change the background image, select another image from this list. Alternatively, use the J/L keys on the keyboard to cycle through the list.',
    attachTo: '.active left',
    tetherOptions: {
      attachment: 'bottom center',
      targetAttachment: 'top center',
      offset: '-5 0'
    }
});

tour.addStep('selectedFlashlight', {
    text: 'The current flashlight image is indicated with a dot.',
    attachTo: '.second-active left',
    tetherOptions: {
      attachment: 'bottom center',
      targetAttachment: 'top center',
      offset: '-5 0'
    }
});

tour.addStep('changeFlashlight', {
    text: 'To change the flashlight image, use the I/K keys on the keyboard to cycle through the list.',
    attachTo: '.second-active left',
    tetherOptions: {
      attachment: 'bottom center',
      targetAttachment: 'top center',
      offset: '-5 0'
    }
});

tour.addStep('changePage', {
    text: 'To see other pages of the Chad Gospels, select them from this dropdown.',
    attachTo: '#page-selector right',
    beforeShowPromise: function(){$("#page-selector").show()},
    tetherOptions: {
      attachment: 'middle right',
      targetAttachment: 'middle left',
      offset: '0 5'
    },
    when: {
      "hide": function(){$("#page-selector").slideUp(200)}
    }
})

tour.addStep('help', {
    text: 'To access this tour again, click the help button.',
    attachTo: '#help-button right',
    tetherOptions: {
      attachment: 'top left',
      targetAttachment: 'top right',
      offset: '10 -5'
    },
    buttons: [
      {
        text: 'Get Started',
        action: tour.complete
      }
    ]
})

function startTour() {
    primary.setMouseNavEnabled(false);
    $(".navigator").hide();
    resetView();

    var bg_offset = primary.viewport.contentSize.x * primary.viewport.viewportToImageZoom(primary.viewport.getZoom()) / 2;
    tour.getById("background").options.tetherOptions.offset = "0 -" + bg_offset + "px";
    tour.getById("background").options.text = backgroundText + pages[pageIndex]['layers'][primaryLayerIndex]['version'] + ".";

    var fl_offset = flashlights[0].clipSize * primary.viewport.getZoom() / 2;
    tour.getById("flashlight").options.tetherOptions.offset = "0 -" + fl_offset + "px";
    tour.getById("flashlight").options.text = flashlightText + pages[pageIndex]['layers'][secondaryLayerIndex]['version'] + ".";

    elemBeforeActive = $("li.active").prev();
    if ( elemBeforeActive.length === 0 ) {
      elemBeforeActive = $("li.active")[0];
    } else {
      elemBeforeActive = elemBeforeActive[0];
    }
    tour.getById("changePrimary").options.attachTo = {element: elemBeforeActive, on: 'left'};

    if( $("#layer-selector").css("display") == 'none' ) toggleLayerSelector();
    tour.start();
}

tour.on('complete', function() {
  _.each(tour.steps, function(step) {
    step.destroy();
  });
  primary.setMouseNavEnabled(true);
  $(".navigator").show();
})

// Fancy Effects - Warning: Only use one at a time
var original = {};
var modulator;

var angle = 0;
var theta  = 0.1;
var demoLight = 0;
function startDemoRotation() {
  var temp_event = {delta: {x:0, y:0}};
  movingFlashlight = true;
  whichFlashlight = demoLight;

  original.x = flashlights[demoLight].x;
  original.y = flashlights[demoLight].y;

  // Offset the origin of rotation
  flashlights[demoLight].x -= 2.5 / pc.width / primary.viewport.getZoom();
  flashlights[demoLight].y -= 2.5 / pc.height / primary.viewport.getZoom();

  modulator = setInterval(function(){
    var offset_x = Math.cos(angle);
    var offset_y = Math.sin(angle);
    temp_event.delta.x = offset_x;
    temp_event.delta.y = offset_y;

    onViewerDrag(temp_event);
    angle += theta;
  }, 20)
}

function resetDemoRotation() {
  clearInterval(modulator);
  angle = 0;

  flashlights[demoLight].x = original.x;
  flashlights[demoLight].y = original.y;
  original = {};

  movingFlashlight = false;
  whichFlashlight = null;
  invalidate();
}

function startDemoScroll() {
  var temp_event = {originalEvent: {wheelDelta: 0}};
  shiftDown = true;
  whichFlashlight = demoLight;

  original.clipSize = flashlights[demoLight].clipSize;

  modulator = setInterval(function(){
    temp_event.originalEvent.wheelDelta = Math.sin(angle) * 100;

    onViewerScroll(temp_event);
    angle += theta;
  }, 10)
}

function resetDemoScroll() {
  clearInterval(modulator);
  angle = 0;

  flashlights[demoLight].clipSize = original.clipSize;
  original = {};

  shiftDown = false;
  whichFlashlight = null;
  invalidate();
}
