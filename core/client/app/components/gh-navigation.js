import Ember from 'ember';

export default Ember.Component.extend({
    tagName: 'section',
    classNames: 'gh-view',

    didInsertElement: function () {
        var navContainer = this.$('.js-gh-blognav'),
            navElements = '.gh-blognav-item:not(.gh-blognav-item:last-child)',
            self = this;

        navContainer.sortable({
            handle: '.gh-blognav-grab',
            items: navElements,

            start: function (event, ui) {
                Ember.run(function () {
                    ui.item.data('start-index', ui.item.index());
                });
            },

            update: function (event, ui) {
                Ember.run(function () {
                    self.sendAction('moveItem', ui.item.data('start-index'), ui.item.index());
                });
            }
        });
    },

    willDestroyElement: function () {
        this.$('.js-gh-blognav').sortable('destroy');
    }
});
