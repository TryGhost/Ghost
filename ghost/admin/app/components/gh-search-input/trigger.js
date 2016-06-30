import run from 'ember-runloop';
import {isBlank} from 'ember-utils';
import Component from 'ember-component';
import {invokeAction} from 'ember-invoke-action';

export default Component.extend({
    open() {
        this.get('select.actions').open();
    },

    close() {
        this.get('select.actions').close();
    },

    actions: {
        captureMouseDown(e) {
            e.stopPropagation();
        },

        search(term) {
            if (isBlank(term) === this.get('select.isOpen')) {
                run.scheduleOnce('afterRender', this, isBlank(term) ? this.close : this.open);
            }

            invokeAction(this, 'select.actions.search', term);
        },

        focusInput() {
            this.$('input')[0].focus();
        },

        resetInput() {
            this.$('input').val('');
        },

        handleKeydown(e) {
            let select = this.get('select');
            if (!select.isOpen) {
                e.stopPropagation();
            }
        }
    }
});
