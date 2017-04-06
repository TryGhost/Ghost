import Component from 'ember-component';
import {htmlSafe} from 'ember-string';
import injectService from 'ember-service/inject';
import computed from 'ember-computed';
import calculatePosition from 'ember-basic-dropdown/utils/calculate-position';

export default Component.extend({
    tagName: 'nav',
    classNames: ['gh-nav'],
    classNameBindings: ['open'],

    open: false,

    navMenuIcon: computed('config.blogUrl', 'settings.icon', function () {
        let blogIcon = this.get('settings.icon') ? this.get('settings.icon') : 'favicon.ico';
        let url = `${this.get('config.blogUrl')}/${blogIcon}`;

        return htmlSafe(`background-image: url(${url})`);
    }),

    config: injectService(),
    settings: injectService(),
    session: injectService(),
    ghostPaths: injectService(),
    feature: injectService(),
    routing: injectService('-routing'),

    mouseEnter() {
        this.sendAction('onMouseEnter');
    },

    // equivalent to "left: auto; right: -20px"
    userDropdownPosition(trigger, dropdown) {
        let {horizontalPosition, verticalPosition, style} = calculatePosition(...arguments);
        let {width: dropdownWidth} = dropdown.firstElementChild.getBoundingClientRect();

        style.right += (dropdownWidth - 20);
        style['z-index'] = 1100;

        return {horizontalPosition, verticalPosition, style};
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
