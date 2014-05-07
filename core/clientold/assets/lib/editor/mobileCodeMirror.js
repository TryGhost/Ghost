// Taken from js-bin with thanks to Remy Sharp
// yeah, nasty, but it allows me to switch from a RTF to plain text if we're running a iOS

/*global Ghost, $, _, DocumentTouch, CodeMirror*/
(function () {
    Ghost.touchEditor = false;

    var noop = function () {},
        hasTouchScreen,
        smallScreen,
        TouchEditor,
        _oldCM,
        key;

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

    if (hasTouchScreen()) {
        $('body').addClass('touch-editor');
        Ghost.touchEditor = true;

        TouchEditor = function (el, options) {
            /*jshint unused:false*/
            this.textarea = el;
            this.win = { document : this.textarea };
            this.ready = true;
            this.wrapping = document.createElement('div');

            var textareaParent = this.textarea.parentNode;
            this.wrapping.appendChild(this.textarea);
            textareaParent.appendChild(this.wrapping);

            this.textarea.style.opacity = 1;

            $(this.textarea).blur(_.throttle(function () {
                $(document).trigger('markdownEditorChange', { panelId: el.id });
            }, 200));

            if (!smallScreen()) {
                $(this.textarea).on('change', _.throttle(function () {
                    $(document).trigger('markdownEditorChange', { panelId: el.id });
                }, 200));
            }
        };

        TouchEditor.prototype = {
            setOption: function (type, handler) {
                if (type === 'onChange') {
                    $(this.textarea).change(handler);
                }
            },
            eachLine: function () {
                return [];
            },
            getValue: function () {
                return this.textarea.value;
            },
            setValue: function (code) {
                this.textarea.value = code;
            },
            focus: noop,
            getCursor: function () {
                return { line: 0, ch: 0 };
            },
            setCursor: noop,
            currentLine: function () {
                return 0;
            },
            cursorPosition: function () {
                return { character: 0 };
            },
            addMarkdown: noop,
            nthLine: noop,
            refresh: noop,
            selectLines: noop,
            on: noop
        };

        _oldCM = CodeMirror;

        // CodeMirror = noop;

        for (key in _oldCM) {
            if (_oldCM.hasOwnProperty(key)) {
                CodeMirror[key] = noop;
            }
        }

        CodeMirror.fromTextArea = function (el, options) {
            return new TouchEditor(el, options);
        };

        CodeMirror.keyMap = { basic: {} };

    }
}());