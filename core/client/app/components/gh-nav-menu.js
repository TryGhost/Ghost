import Ember from 'ember';

export default Ember.Component.extend({
    tagName: 'nav',
    classNames: ['gh-nav'],
    classNameBindings: ['open'],

    config: Ember.inject.service(),

    open: false,

    autoNav: null,

    mouseEnter: function () {
        if (!this.get('autoNav')) {
            return;
        }

        this.set('open', true);
    },

    actions: {
        toggleMaximise: function () {
            this.sendAction('toggleMaximise');
        },

        openModal: function (modal) {
            this.sendAction('openModal', modal);
        }
    }
});
