import Ember from 'ember';
import EditorAPI from 'ghost/mixins/ed-editor-api';
import EditorShortcuts from 'ghost/mixins/ed-editor-shortcuts';
import EditorScroll from 'ghost/mixins/ed-editor-scroll';

const {TextArea, inject, run} = Ember;

export default TextArea.extend(EditorAPI, EditorShortcuts, {
    focus: false,

    scrollSync: inject.service('scroll-sync'),

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

        this.attrs.setEditor(this);

        this.get('scrollSync').registerLeftPane(this.$()[0]);

        run.scheduleOnce('afterRender', this, this.afterRenderEvent);
    },

    willDestroyElement() {
        this._super(...arguments);
        this.get('scrollSync').teardownLeftPane();
    },

    afterRenderEvent() {
        if (this.get('focus') && this.get('focusCursorAtEnd')) {
            this.setSelection('end');
        }
    },

    actions: {
        toggleCopyHTMLModal(generatedHTML) {
            this.attrs.toggleCopyHTMLModal(generatedHTML);
        }
    }
});
