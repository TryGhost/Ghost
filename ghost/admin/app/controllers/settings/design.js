import RSVP from 'rsvp';
import Controller from 'ember-controller';
import computed, {notEmpty} from 'ember-computed';
import injectService from 'ember-service/inject';
import SettingsSaveMixin from 'ghost-admin/mixins/settings-save';
import NavigationItem from 'ghost-admin/models/navigation-item';
import $ from 'jquery';

export default Controller.extend(SettingsSaveMixin, {
    config: injectService(),
    ghostPaths: injectService(),
    notifications: injectService(),
    session: injectService(),

    newNavItem: null,

    themes: null,
    themeToDelete: null,
    showDeleteThemeModal: notEmpty('themeToDelete'),

    blogUrl: computed('config.blogUrl', function () {
        let url = this.get('config.blogUrl');

        return url.slice(-1) !== '/' ? `${url}/` : url;
    }),

    init() {
        this._super(...arguments);
        this.set('newNavItem', NavigationItem.create({isNew: true}));
    },

    save() {
        let navItems = this.get('model.navigation');
        let newNavItem = this.get('newNavItem');
        let notifications = this.get('notifications');
        let validationPromises = [];

        if (!newNavItem.get('isBlank')) {
            validationPromises.pushObject(this.send('addNavItem'));
        }

        navItems.map((item) => {
            validationPromises.pushObject(item.validate());
        });

        return RSVP.all(validationPromises).then(() => {
            return this.get('model').save().catch((err) => {
                notifications.showAPIError(err);
            });
        }).catch(() => {
            // TODO: noop - needed to satisfy spinner button
        });
    },

    addNewNavItem() {
        let navItems = this.get('model.navigation');
        let newNavItem = this.get('newNavItem');

        newNavItem.set('isNew', false);
        navItems.pushObject(newNavItem);
        this.set('newNavItem', NavigationItem.create({isNew: true}));
    },

    _deleteTheme() {
        let theme = this.get('store').peekRecord('theme', this.get('themeToDelete').name);

        if (!theme) {
            return;
        }

        return theme.destroyRecord().catch((error) => {
            this.get('notifications').showAPIError(error);
        });
    },

    actions: {
        addNavItem() {
            let newNavItem = this.get('newNavItem');

            // If the url sent through is blank (user never edited the url)
            if (newNavItem.get('url') === '') {
                newNavItem.set('url', '/');
            }

            return newNavItem.validate().then(() => {
                this.addNewNavItem();
            });
        },

        deleteNavItem(item) {
            if (!item) {
                return;
            }

            let navItems = this.get('model.navigation');

            navItems.removeObject(item);
        },

        reorderItems(navItems) {
            this.set('model.navigation', navItems);
        },

        updateUrl(url, navItem) {
            if (!navItem) {
                return;
            }

            navItem.set('url', url);
        },

        activateTheme(theme) {
            return theme.activate();
        },

        downloadTheme(theme) {
            let themeURL = `${this.get('ghostPaths.apiRoot')}/themes/${theme.name}`;
            let accessToken = this.get('session.data.authenticated.access_token');
            let downloadURL = `${themeURL}/download/?access_token=${accessToken}`;
            let iframe = $('#iframeDownload');

            if (iframe.length === 0) {
                iframe = $('<iframe>', {id: 'iframeDownload'}).hide().appendTo('body');
            }

            iframe.attr('src', downloadURL);
        },

        deleteTheme(theme) {
            if (theme) {
                return this.set('themeToDelete', theme);
            }

            return this._deleteTheme();
        },

        hideDeleteThemeModal() {
            this.set('themeToDelete', null);
        },

        reset() {
            this.set('newNavItem', NavigationItem.create({isNew: true}));
        }
    }
});
