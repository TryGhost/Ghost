/*global DocumentTouch,FastClick*/
var hasTouchScreen,
    smallScreen,
    initFastClick,
    responsiveAction;

// Taken from "Responsive design & the Guardian" with thanks to Matt Andrews
// Added !window._phantom so that the functional tests run as though this is not a touch screen.
// In future we can do something more advanced here for testing both touch and non touch
hasTouchScreen = function () {
    return !window._phantom &&
        (
            ('ontouchstart' in window) ||
            (window.DocumentTouch && document instanceof DocumentTouch)
    );
};

smallScreen = function () {
    if (window.matchMedia('(max-width: 1000px)').matches) {
        return true;
    }

    return false;
};

initFastClick = function () {
    Ember.run.scheduleOnce('afterRender', null, function () {
        FastClick.attach(document.body);
    });
};

responsiveAction = function responsiveAction(event, mediaCondition, cb) {
    if (!window.matchMedia(mediaCondition).matches) {
        return;
    }

    event.preventDefault();
    event.stopPropagation();
    cb();
};

export { hasTouchScreen, smallScreen, responsiveAction };
export default {
    hasTouchScreen: hasTouchScreen,
    smallScreen: smallScreen,
    initFastClick: initFastClick,
    responsiveAction: responsiveAction
};
