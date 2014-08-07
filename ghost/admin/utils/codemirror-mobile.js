/*global CodeMirror, device, FastClick*/
import createTouchEditor from 'ghost/assets/lib/touch-editor';

var setupMobileCodeMirror,
    TouchEditor,
    init;

setupMobileCodeMirror = function setupMobileCodeMirror() {
    var noop = function () {},
        key;

    for (key in CodeMirror) {
        if (CodeMirror.hasOwnProperty(key)) {
            CodeMirror[key] = noop;
        }
    }

    CodeMirror.fromTextArea = function (el, options) {
        return new TouchEditor(el, options);
    };

    CodeMirror.keyMap = { basic: {} };
};

init = function init() {
    //Codemirror does not function on mobile devices,
    // nor on any iDevice.
    if (device.mobile() || (device.tablet() && device.ios())) {
        $('body').addClass('touch-editor');

        // make editor tabs touch-to-toggle in portrait mode
        $('#entry-markdown-header').on('tap', function () {
            $('.entry-markdown').addClass('active');
            $('.entry-preview').removeClass('active');
        });

        $('#entry-preview-header').on('tap', function () {
            $('.entry-markdown').removeClass('active');
            $('.entry-preview').addClass('active');
        });


        Ember.touchEditor = true;
        //initialize FastClick to remove touch delays
        Ember.run.scheduleOnce('afterRender', null, function () {
            FastClick.attach(document.body);
        });
        TouchEditor = createTouchEditor();
        setupMobileCodeMirror();
    }
};

export default {
    createIfMobile: init
};
