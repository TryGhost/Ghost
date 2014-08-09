var createTouchEditor = function createTouchEditor() {
    var noop = function () {},
        TouchEditor;

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
        on: noop,
        off: noop
    };

    return TouchEditor;
};

export default createTouchEditor;
