import Ember from 'ember';
import EditorAPI from 'ghost/mixins/ed-editor-api';
import EditorShortcuts from 'ghost/mixins/ed-editor-shortcuts';
import EditorScroll from 'ghost/mixins/ed-editor-scroll';

var Editor;

Editor = Ember.TextArea.extend(EditorAPI, EditorShortcuts, EditorScroll, {
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
        this.sendAction('setEditor', this);

        Ember.run.scheduleOnce('afterRender', this, this.afterRenderEvent);
    },

    afterRenderEvent: function () {
        if (this.get('focus') && this.get('focusCursorAtEnd')) {
            this.setSelection('end');
        }
    },

    /**
     * Disable editing in the textarea (used while an upload is in progress)
     */
    disable: function () {
        var textarea = this.get('element');
        textarea.setAttribute('readonly', 'readonly');
    },

    /**
     * Reenable editing in the textarea
     */
    enable: function () {
        var textarea = this.get('element');
        textarea.removeAttribute('readonly');
    }
});

export default Editor;
