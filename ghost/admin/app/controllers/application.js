import Controller from '@ember/controller';
import {computed} from '@ember/object';
import {inject as injectService} from '@ember/service';

export default Controller.extend({
    dropdown: injectService(),
    session: injectService(),
    settings: injectService(),
    ui: injectService(),

    showNavMenu: computed('currentPath', 'session.isAuthenticated', 'session.user.isFulfilled', function () {
        // we need to defer showing the navigation menu until the session.user
        // promise has fulfilled so that gh-user-can-admin has the correct data
        if (!this.get('session.isAuthenticated') || !this.get('session.user.isFulfilled')) {
            return false;
        }

        return (this.get('currentPath') !== 'error404' || this.get('session.isAuthenticated'))
                && !this.get('currentPath').match(/(signin|signup|setup|reset)/);
    }),

    topNotificationCount: 0,
    showMarkdownHelpModal: false,

    actions: {
        topNotificationChange(count) {
            this.set('topNotificationCount', count);
        }
    }
});
