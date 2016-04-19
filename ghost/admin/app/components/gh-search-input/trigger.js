import Ember from 'ember';

const {run, isBlank, Component} = Ember;

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

            this.get('select.actions.search')(term);
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
