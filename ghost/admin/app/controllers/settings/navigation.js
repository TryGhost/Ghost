import RSVP from 'rsvp';
import Controller from 'ember-controller';
import computed from 'ember-computed';
import injectService from 'ember-service/inject';
import SettingsSaveMixin from 'ghost-admin/mixins/settings-save';
import NavigationItem from 'ghost-admin/models/navigation-item';

export default Controller.extend(SettingsSaveMixin, {
    config: injectService(),
    notifications: injectService(),

    newNavItem: null,

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
            validationPromises.pushObject(this.send('addItem'));
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

    actions: {
        addItem() {
            let newNavItem = this.get('newNavItem');

            // If the url sent through is blank (user never edited the url)
            if (newNavItem.get('url') === '') {
                newNavItem.set('url', '/');
            }

            return newNavItem.validate().then(() => {
                this.addNewNavItem();
            });
        },

        deleteItem(item) {
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

        reset() {
            this.set('newNavItem', NavigationItem.create({isNew: true}));
        }
    }
});
