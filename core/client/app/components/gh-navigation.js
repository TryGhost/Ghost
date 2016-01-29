import Ember from 'ember';

const {Component, run} = Ember;

export default Component.extend({
    tagName: 'section',
    classNames: 'gh-view',

    didInsertElement() {
        let navContainer = this.$('.js-gh-blognav');
        let navElements = '.gh-blognav-item:not(.gh-blognav-item:last-child)';
        // needed because jqueryui sortable doesn't trigger babel's autoscoping
        let _this = this;

        this._super(...arguments);

        navContainer.sortable({
            handle: '.gh-blognav-grab',
            items: navElements,

            start(event, ui) {
                run(() => {
                    ui.item.data('start-index', ui.item.index());
                });
            },

            update(event, ui) {
                run(() => {
                    _this.sendAction('moveItem', ui.item.data('start-index'), ui.item.index());
                });
            }
        });
    },

    willDestroyElement() {
        this._super(...arguments);
        this.$('.ui-sortable').sortable('destroy');
    }
});
