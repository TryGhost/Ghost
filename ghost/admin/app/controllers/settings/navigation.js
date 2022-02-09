import classic from 'ember-classic-decorator';
import {action, computed} from '@ember/object';
import {inject as service} from '@ember/service';
/* eslint-disable ghost/ember/alias-model-in-controller */
import $ from 'jquery';
import Controller from '@ember/controller';
import NavigationItem from 'ghost-admin/models/navigation-item';
import RSVP from 'rsvp';
import {task} from 'ember-concurrency';

@classic
export default class NavigationController extends Controller {
    @service config;
    @service ghostPaths;
    @service notifications;
    @service session;
    @service settings;

    dirtyAttributes = false;
    newNavItem = null;
    newSecondaryNavItem = null;

    init() {
        super.init(...arguments);
        this.set('newNavItem', NavigationItem.create({isNew: true}));
        this.set('newSecondaryNavItem', NavigationItem.create({isNew: true, isSecondary: true}));
    }

    @computed('config.blogUrl')
    get blogUrl() {
        let url = this.get('config.blogUrl');

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

        let navItems = item.isSecondary ? this.get('settings.secondaryNavigation') : this.get('settings.navigation');

        navItems.removeObject(item);
        this.set('dirtyAttributes', true);
    }

    @action
    updateLabel(label, navItem) {
        if (!navItem) {
            return;
        }

        if (navItem.get('label') !== label) {
            navItem.set('label', label);
            this.set('dirtyAttributes', true);
        }
    }

    @action
    updateUrl(url, navItem) {
        if (!navItem) {
            return;
        }

        if (navItem.get('url') !== url) {
            navItem.set('url', url);
            this.set('dirtyAttributes', true);
        }

        return url;
    }

    @action
    toggleLeaveSettingsModal(transition) {
        let leaveTransition = this.leaveSettingsTransition;

        if (!transition && this.showLeaveSettingsModal) {
            this.set('leaveSettingsTransition', null);
            this.set('showLeaveSettingsModal', false);
            return;
        }

        if (!leaveTransition || transition.targetName === leaveTransition.targetName) {
            this.set('leaveSettingsTransition', transition);

            // if a save is running, wait for it to finish then transition
            if (this.save.isRunning) {
                return this.save.last.then(() => {
                    transition.retry();
                });
            }

            // we genuinely have unsaved data, show the modal
            this.set('showLeaveSettingsModal', true);
        }
    }

    @action
    leaveSettings() {
        let transition = this.leaveSettingsTransition;
        let settings = this.settings;

        if (!transition) {
            this.notifications.showAlert('Sorry, there was an error in the application. Please let the Ghost team know what happened.', {type: 'error'});
            return;
        }

        // roll back changes on settings props
        settings.rollbackAttributes();
        this.set('dirtyAttributes', false);

        return transition.retry();
    }

    @action
    reset() {
        this.set('newNavItem', NavigationItem.create({isNew: true}));
        this.set('newSecondaryNavItem', NavigationItem.create({isNew: true, isSecondary: true}));
    }

    addNewNavItem(item) {
        let navItems = item.isSecondary ? this.get('settings.secondaryNavigation') : this.get('settings.navigation');

        item.set('isNew', false);
        navItems.pushObject(item);
        this.set('dirtyAttributes', true);

        if (item.isSecondary) {
            this.set('newSecondaryNavItem', NavigationItem.create({isNew: true, isSecondary: true}));
            $('.gh-blognav-container:last .gh-blognav-line:last input:first').focus();
        } else {
            this.set('newNavItem', NavigationItem.create({isNew: true}));
            $('.gh-blognav-container:first .gh-blognav-line:last input:first').focus();
        }
    }

    @task *saveTask() {
        let navItems = this.get('settings.navigation');
        let secondaryNavItems = this.get('settings.secondaryNavigation');

        let notifications = this.notifications;
        let validationPromises = [];

        if (!this.newNavItem.get('isBlank')) {
            validationPromises.pushObject(this.send('addNavItem', this.newNavItem));
        }

        if (!this.newSecondaryNavItem.get('isBlank')) {
            validationPromises.pushObject(this.send('addNavItem', this.newSecondaryNavItem));
        }

        navItems.map((item) => {
            validationPromises.pushObject(item.validate());
        });

        secondaryNavItems.map((item) => {
            validationPromises.pushObject(item.validate());
        });

        try {
            yield RSVP.all(validationPromises);
            this.set('dirtyAttributes', false);
            return yield this.settings.save();
        } catch (error) {
            if (error) {
                notifications.showAPIError(error);
                throw error;
            }
        }
    }
}
