import Ember from 'ember';
import ValidationStateMixin from 'ghost/mixins/validation-state';

export default Ember.Component.extend(ValidationStateMixin, {
    classNames: 'gh-blognav-item',
    classNameBindings: ['errorClass'],

    attributeBindings: ['order:data-order'],
    order: Ember.computed.readOnly('navItem.order'),
    errors: Ember.computed.readOnly('navItem.errors'),

    errorClass: Ember.computed('hasError', function () {
        if (this.get('hasError')) {
            return 'gh-blognav-item--error';
        }
    }),

    keyPress: function (event) {
        // enter key
        if (event.keyCode === 13) {
            event.preventDefault();
            this.send('addItem');
        }

        this.get('navItem.errors').clear();
    },

    actions: {
        addItem: function () {
            this.sendAction('addItem');
        },

        deleteItem: function (item) {
            this.sendAction('deleteItem', item);
        },

        updateUrl: function (value) {
            this.sendAction('updateUrl', value, this.get('navItem'));
        }
    }
});
