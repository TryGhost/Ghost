var NavItemComponent = Ember.Component.extend({
    classNames: 'navigation-item',

    attributeBindings: ['order:data-order'],
    order: Ember.computed.readOnly('navItem.order'),

    keyPress: function (event) {
        // enter key
        if (event.keyCode === 13) {
            event.preventDefault();
            this.get('controller').send('addItem');
        }
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

export default NavItemComponent;
