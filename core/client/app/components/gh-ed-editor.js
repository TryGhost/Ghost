import Ember from 'ember';
import EditorAPI from 'ghost/mixins/ed-editor-api';
import EditorShortcuts from 'ghost/mixins/ed-editor-shortcuts';
import EditorScroll from 'ghost/mixins/ed-editor-scroll';

const {TextArea, run} = Ember;

export default TextArea.extend(EditorAPI, EditorShortcuts, EditorScroll, {
    focus: false,

    /**
     * Tell the controller about focusIn events, will trigger an autosave on a new document
     */
    focusIn() {
        this.sendAction('onFocusIn');
    },

    /**
     * Sets the focus of the textarea if needed
     */
    setFocus() {
        if (this.get('focus')) {
            this.$().val(this.$().val()).focus();
        }
    },

    /**
     * Sets up properties at render time
     */
    didInsertElement() {
        this._super(...arguments);

        this.setFocus();

        this.sendAction('setEditor', this);

        run.scheduleOnce('afterRender', this, this.afterRenderEvent);
    },

    afterRenderEvent() {
        if (this.get('focus') && this.get('focusCursorAtEnd')) {
            this.setSelection('end');
        }
    },

    /**
     * Disable editing in the textarea (used while an upload is in progress)
     */
    disable() {
        let textarea = this.get('element');
        textarea.setAttribute('readonly', 'readonly');
    },

    /**
     * Reenable editing in the textarea
     */
    enable() {
        let textarea = this.get('element');
        textarea.removeAttribute('readonly');
    }
});
