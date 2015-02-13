import BaseView from 'ghost/views/settings/content-base';

var SettingsNavigationView = BaseView.extend({

    didInsertElement: function () {
        var controller = this.get('controller'),
            navContainer = Ember.$('.js-settings-navigation'),
            navElements = '.navigation-item:not(.navigation-item:last-child)';

        navContainer.sortable({
            handle: '.navigation-item-drag-handle',
            items: navElements,

            update: function () {
                var indexes = [];
                navContainer.find(navElements).each(function () {
                    var order = Ember.$(this).data('order');
                    indexes.push(order);
                });
                controller.updateOrder(indexes);
            }
        });
    },

    willDestroyElement: function () {
        Ember.$('.js-settings-navigation').sortable('destroy');
    }

});

export default SettingsNavigationView;
