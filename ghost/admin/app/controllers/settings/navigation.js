import Controller from '@ember/controller';
import NavigationItem from 'ghost-admin/models/navigation-item';
import RSVP from 'rsvp';
import {action} from '@ember/object';
import {inject} from 'ghost-admin/decorators/inject';
import {inject as service} from '@ember/service';
import {task} from 'ember-concurrency';
import {tracked} from '@glimmer/tracking';

export default class NavigationController extends Controller {
    @service ghostPaths;
    @service notifications;
    @service session;
    @service settings;

    @inject config;

    @tracked dirtyAttributes = false;
    @tracked newNavItem = NavigationItem.create({isNew: true});
    @tracked newSecondaryNavItem = NavigationItem.create({isNew: true, isSecondary: true});

    get blogUrl() {
        let url = this.config.blogUrl;

        return url.slice(-1) !== '/' ? `${url}/` : url;
    }

    @action
    save() {
        this.saveTask.perform();
    }

    @action
    addNavItem(item) {
        // If the url sent through is blank (user never edited the url)
        if (item.get('url') === '') {
            item.set('url', '/');
        }

        return item.validate().then(() => {
            this.addNewNavItem(item);
        });
    }

    @action
    deleteNavItem(item) {
        if (!item) {
            return;
        }

        let navItems = item.isSecondary ? this.settings.secondaryNavigation : this.settings.navigation;

        navItems.removeObject(item);
        this.dirtyAttributes = true;
    }

    @action
    updateLabel(label, navItem) {
        if (!navItem) {
            return;
        }

        if (navItem.get('label') !== label) {
            navItem.set('label', label);
            this.dirtyAttributes = true;
        }
    }

    @action
    updateUrl(url, navItem) {
        if (!navItem) {
            return;
        }

        if (navItem.get('url') !== url) {
            navItem.set('url', url);
            this.dirtyAttributes = true;
        }

        return url;
    }

    @action
    reset() {
        this.newNavItem = NavigationItem.create({isNew: true});
        this.newSecondaryNavItem = NavigationItem.create({isNew: true, isSecondary: true});
    }

    addNewNavItem(item) {
        let navItems = item.isSecondary ? this.settings.secondaryNavigation : this.settings.navigation;

        item.set('isNew', false);
        navItems.pushObject(item);
        this.dirtyAttributes = true;

        if (item.isSecondary) {
            this.newSecondaryNavItem = NavigationItem.create({isNew: true, isSecondary: true});
        } else {
            this.newNavItem = NavigationItem.create({isNew: true});
        }
    }

    @task
    *saveTask() {
        let navItems = this.settings.navigation;
        let secondaryNavItems = this.settings.secondaryNavigation;

        let notifications = this.notifications;
        let validationPromises = [];

        if (!this.newNavItem.get('isBlank')) {
            validationPromises.pushObject(this.send('addNavItem', this.newNavItem));
        }

        if (!this.newSecondaryNavItem.get('isBlank')) {
            validationPromises.pushObject(this.send('addNavItem', this.newSecondaryNavItem));
        }

        navItems.forEach((item) => {
            validationPromises.pushObject(item.validate());
        });

        secondaryNavItems.forEach((item) => {
            validationPromises.pushObject(item.validate());
        });

        try {
            yield RSVP.all(validationPromises);

            // If some attributes have been changed, rebuild
            // the model arrays or changes will not be detected
            if (this.dirtyAttributes) {
                this.settings.navigation = [...this.settings.navigation];
                this.settings.secondaryNavigation = [...this.settings.secondaryNavigation];
            }

            this.dirtyAttributes = false;
            return yield this.settings.save();
        } catch (error) {
            if (error) {
                notifications.showAPIError(error);
                throw error;
            }
        }
    }
}
