import Ember from 'ember';
import EditorAPI from 'ghost-admin/mixins/ed-editor-api';
import EditorShortcuts from 'ghost-admin/mixins/ed-editor-shortcuts';
import EditorScroll from 'ghost-admin/mixins/ed-editor-scroll';
import {invokeAction} from 'ember-invoke-action';

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

        invokeAction(this, 'setEditor', this);

        run.scheduleOnce('afterRender', this, this.afterRenderEvent);
    },

    afterRenderEvent() {
        if (this.get('focus') && this.get('focusCursorAtEnd')) {
            this.setSelection('end');
        }
    },

    actions: {
        toggleCopyHTMLModal(generatedHTML) {
            invokeAction(this, 'toggleCopyHTMLModal', generatedHTML);
        }
    }
});
