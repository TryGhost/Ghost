import Ember from 'ember';

const {
    Component,
    inject: {service},
    computed,
    observer
} = Ember;

export default Component.extend({
    tagName: 'nav',
    classNames: ['gh-nav'],
    classNameBindings: ['open'],

    open: false,
    subscribersEnabled: false,

    navMenuIcon: computed('ghostPaths.subdir', function () {
        let url = `${this.get('ghostPaths.subdir')}/ghost/img/ghosticon.jpg`;

        return Ember.String.htmlSafe(`background-image: url(${url})`);
    }),

    config: service(),
    session: service(),
    ghostPaths: service(),
    feature: service(),

    // TODO: the features service should offer some way to propogate raw values
    // rather than promises so we don't need to jump through the hoops below
    didInsertElement() {
        this.updateSubscribersEnabled();
    },

    updateFeatures: observer('feature.labs.subscribers', function () {
        this.updateSubscribersEnabled();
    }),

    updateSubscribersEnabled() {
        this.get('feature.subscribers').then((enabled) => {
            this.set('subscribersEnabled', enabled);
        });
    },

    mouseEnter() {
        this.sendAction('onMouseEnter');
    },

    actions: {
        toggleAutoNav() {
            this.sendAction('toggleMaximise');
        },

        showMarkdownHelp() {
            this.sendAction('showMarkdownHelp');
        },

        closeMobileMenu() {
            this.sendAction('closeMobileMenu');
        },

        openAutoNav() {
            this.sendAction('openAutoNav');
        }
    }
});
