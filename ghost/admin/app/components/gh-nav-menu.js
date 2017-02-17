import Component from 'ember-component';
import {htmlSafe} from 'ember-string';
import injectService from 'ember-service/inject';
import computed from 'ember-computed';

export default Component.extend({
    tagName: 'nav',
    classNames: ['gh-nav'],
    classNameBindings: ['open'],

    open: false,

    navMenuIcon: computed('config.blogUrl', function () {
        let url = `${this.get('config.blogUrl')}/favicon.png`;

        return htmlSafe(`background-image: url(${url})`);
    }),

    config: injectService(),
    session: injectService(),
    ghostPaths: injectService(),
    feature: injectService(),
    routing: injectService('-routing'),

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
