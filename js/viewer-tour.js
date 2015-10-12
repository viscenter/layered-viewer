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
      offset: '0 -' + (20)
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
      offset: '0 -' + (20)
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
    text: 'To change the background image, select another image from this list. Alternatively, use the <span class="tour-emphasis">J/L</span> keys on the keyboard to cycle through the list.',
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
    text: 'To change the flashlight image, use the <span class="tour-emphasis">I/K</span> keys on the keyboard to cycle through the list.',
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
    original.x = flashlights[demoLight].x;
    original.y = flashlights[demoLight].y;
    original.clipSize = flashlights[demoLight].clipSize;
    flashlights[demoLight].x = 0.5;
    flashlights[demoLight].y = 0.5;
    flashlights[demoLight].clipSize = 500;
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
  flashlights[demoLight].x = original.x;
  flashlights[demoLight].y = original.y;
  flashlights[demoLight].clipSize = original.clipSize;
  original = {};
  _.each(tour.steps, function(step) {
    step.destroy();
  });
  primary.setMouseNavEnabled(true);
  $(".navigator").show();
  invalidate();
})

// Fancy Effects - Warning: Only use one at a time
var original = {};
var modulator;

var angle = 0;
var theta  = 2;
var demoLight = 0;
function startDemoRotation() {
  var temp_event = {delta: {x:0, y:0}};
  movingFlashlight = true;
  whichFlashlight = demoLight;

  // Offset the origin of rotation
  flashlights[demoLight].x = 0.5;
  flashlights[demoLight].y = 0.5;
  temp_event.delta.x = 12.5;
  temp_event.delta.y = -12.5;
  onHandleDrag(temp_event);
  // flashlights[demoLight].y -= 10 / pc.height / primary.viewport.getZoom();

  modulator = setInterval(function(){
    var offset_x = Math.cos(3/4*toRadian(angle));
    var offset_y = Math.sin(3/4*toRadian(angle));
    temp_event.delta.x = offset_x * primary.viewport.getZoom();
    temp_event.delta.y = offset_y * primary.viewport.getZoom();

    onHandleDrag(temp_event);
    angle += theta + .5;
  }, 1)
}

function resetDemoRotation() {
  clearInterval(modulator);
  angle = 0;

  flashlights[demoLight].x = 0.5;
  flashlights[demoLight].y = 0.5;

  movingFlashlight = false;
  whichFlashlight = null;
  invalidate();
}

function startDemoScroll() {
  var temp_event = {originalEvent: {wheelDelta: 0},  shift: true};
  whichFlashlight = demoLight;

  flashlights[demoLight].clipSize = 500;

  modulator = setInterval(function(){
    temp_event.originalEvent.wheelDelta = Math.sin(3/4*toRadian(angle)) * 25;
    onViewerScroll(temp_event);
    angle += theta;
  }, 1)
}

function resetDemoScroll() {
  clearInterval(modulator);
  angle = 0;

  flashlights[demoLight].clipSize = 500;

  shiftDown = false;
  whichFlashlight = null;
  invalidate();
}

function toRadian(theta) {
  return theta * Math.PI / 180;
}

function toDegree(theta) {
  return theta * 180 / Math.PI;
}
