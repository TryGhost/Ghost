import BaseView from 'ghost/views/settings/content-base';

var SettingsNavigationView = BaseView.extend({

    didInsertElement: function () {
        var navContainer = Ember.$('.js-settings-navigation'),
            navElements = '.navigation-item:not(.navigation-item:last-child)',
            self = this;

        navContainer.sortable({
            handle: '.navigation-item-drag-handle',
            items: navElements,

            start: function (event, ui) {
                Ember.run(function () {
                    ui.item.data('start-index', ui.item.index());
                });
            },

            update: function (event, ui) {
                Ember.run(function () {
                    self.get('controller').send('moveItem', ui.item.data('start-index'), ui.item.index());
                    ui.item.remove();
                });
            }
        });
    },

    willDestroyElement: function () {
        Ember.$('.js-settings-navigation').sortable('destroy');
    }

});

export default SettingsNavigationView;
