import Ember from 'ember';
import ValidationStateMixin from 'ghost/mixins/validation-state';

const {Component, computed} = Ember;

export default Component.extend(ValidationStateMixin, {
    classNames: 'gh-blognav-item',
    classNameBindings: ['errorClass'],

    attributeBindings: ['order:data-order'],
    order: computed.readOnly('navItem.order'),
    errors: computed.readOnly('navItem.errors'),

    errorClass: computed('hasError', function () {
        if (this.get('hasError')) {
            return 'gh-blognav-item--error';
        }
    }),

    keyPress(event) {
        // enter key
        if (event.keyCode === 13) {
            event.preventDefault();
            this.send('addItem');
        }

        this.get('navItem.errors').clear();
    },

    actions: {
        addItem() {
            this.sendAction('addItem');
        },

        deleteItem(item) {
            this.sendAction('deleteItem', item);
        },

        updateUrl(value) {
            this.sendAction('updateUrl', value, this.get('navItem'));
        }
    }
});
