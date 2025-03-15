import Service, {inject as service} from '@ember/service';
import {action} from '@ember/object';
import {observes} from '@ember-decorators/object';
import {tracked} from '@glimmer/tracking';

const DEFAULT_SETTINGS = {
    expanded: {
        posts: true
    },
    menu: {
        visible: true
    }
};

export default class NavigationService extends Service {
    @service session;

    @tracked settings;

    constructor() {
        super(...arguments);
        this.settings = Object.assign({}, DEFAULT_SETTINGS);
        this.updateSettings();
    }

    // eslint-disable-next-line ghost/ember/no-observers
    @observes('session.{isAuthenticated,user}', 'session.user.accessibility')
    async updateSettings() {
        // avoid fetching user before authenticated otherwise the 403 can fire
        // during authentication and cause errors during setup/signin
        if (!this.session.isAuthenticated || !this.session.user) {
            return;
        }

        let userSettings = JSON.parse(this.session.user.accessibility || '{}') || {};
        this.settings = {...DEFAULT_SETTINGS, ...userSettings.navigation};
    }

    @action
    async toggleExpansion(key) {
        if (!this.settings.expanded) {
            this.settings.expanded = {};
        }

        this.settings.expanded[key] = !this.settings.expanded[key];

        return await this._saveNavigationSettings();
    }

    @action
    async toggleMenu() {
        if (!this.settings.menu) {
            this.settings.menu = {};
        }

        this.settings.menu.visible = !this.settings.menu.visible;

        return await this._saveNavigationSettings();
    }

    async _saveNavigationSettings() {
        let user = this.session.user;
        let userSettings = JSON.parse(user.get('accessibility')) || {};
        userSettings.navigation = this.settings;
        user.set('accessibility', JSON.stringify(userSettings));
        return user.save();
    }
}
