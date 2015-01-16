import TextEditorAPI from 'ghost/mixins/text-editor-api';
import TextEditorShortcuts from 'ghost/mixins/text-editor-shortcuts';
import TextEditorScroll from 'ghost/mixins/text-editor-scroll';

var TextEditor;

TextEditor = Ember.TextArea.extend(TextEditorAPI, TextEditorShortcuts, TextEditorScroll, {
    focus: true,

    /**
     * Tell the controller about focusIn events, will trigger an autosave on a new document
     */
    focusIn: function () {
        this.sendAction('onFocusIn');
    },

    /**
     * Check if the textarea should have focus, and set it if necessary
     */
    setFocus: function () {
        if (this.get('focus')) {
            this.$().val(this.$().val()).focus();
        }
    }.on('didInsertElement'),

    /**
     * Tell the controller about this component
     */
    didInsertElement: function () {
        this.sendAction('setTextEditor', this);

        Ember.run.scheduleOnce('afterRender', this, this.afterRenderEvent);
    },

    afterRenderEvent: function () {
        if (this.get('focus') && this.get('focusCursorAtEnd')) {
            this.setSelection('end');
        }
    },

    /**
     * Use keypress events to trigger autosave
     */
    changeHandler: function () {
        // onChange is sent to trigger autosave
        this.sendAction('onChange');
    },

    /**
     * Bind to the keypress event once the element is in the DOM
     * Use keypress because it's the most reliable cross browser
     */
    attachChangeHandler: function () {
        this.$().on('keypress', Ember.run.bind(this, this.changeHandler));
    }.on('didInsertElement'),

    /**
     * Unbind from the keypress event when the element is no longer in the DOM
     */
    detachChangeHandler: function () {
        this.$().off('keypress');
        Ember.run.cancel(this.get('fixHeightThrottle'));
    }.on('willDestroyElement'),

    /**
     * Disable editing in the textarea (used while an upload is in progress)
     */
    disableTextEditor: function () {
        var textarea = this.get('element');
        textarea.setAttribute('readonly', 'readonly');

        this.detachChangeHandler();
    },

    /**
     * Reenable editing in the textarea
     */
    enableTextEditor: function () {
        var textarea = this.get('element');
        textarea.removeAttribute('readonly');

        // clicking the trash button on an image dropzone causes this function to fire.
        // this line is a hack to prevent multiple event handlers from being attached.
        this.detachChangeHandler();
        this.attachChangeHandler();
    }
});

export default TextEditor;
