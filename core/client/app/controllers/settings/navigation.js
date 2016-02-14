import Ember from 'ember';
import DS from 'ember-data';
import SettingsSaveMixin from 'ghost/mixins/settings-save';
import ValidationEngine from 'ghost/mixins/validation-engine';

const {
    Controller,
    RSVP,
    computed,
    inject: {service},
    isBlank
} = Ember;
const {Errors} = DS;
const emberA = Ember.A;

export const NavItem = Ember.Object.extend(ValidationEngine, {
    label: '',
    url: '',
    isNew: false,

    validationType: 'navItem',

    isComplete: computed('label', 'url', function () {
        let {label, url} = this.getProperties('label', 'url');

        return !isBlank(label) && !isBlank(url);
    }),

    isBlank: computed('label', 'url', function () {
        let {label, url} = this.getProperties('label', 'url');

        return isBlank(label) && isBlank(url);
    }),

    init() {
        this._super(...arguments);
        this.set('errors', Errors.create());
        this.set('hasValidated', emberA());
    }
});

export default Controller.extend(SettingsSaveMixin, {
    config: service(),
    notifications: service(),

    newNavItem: null,

    blogUrl: computed('config.blogUrl', function () {
        let url = this.get('config.blogUrl');

        return url.slice(-1) !== '/' ? `${url}/` : url;
    }),

    navigationItems: computed('model.navigation', function () {
        let navItems;

        try {
            navItems = JSON.parse(this.get('model.navigation') || [{}]);
        } catch (e) {
            navItems = [{}];
        }

        navItems = navItems.map((item) => {
            return NavItem.create(item);
        });

        return navItems;
    }),

    init() {
        this._super(...arguments);
        this.set('newNavItem', NavItem.create({isNew: true}));
    },

    save() {
        let navItems = this.get('navigationItems');
        let newNavItem = this.get('newNavItem');
        let notifications = this.get('notifications');
        let validationPromises = [];
        let navSetting;

        if (!newNavItem.get('isBlank')) {
            validationPromises.pushObject(this.send('addItem'));
        }

        navItems.map((item) => {
            validationPromises.pushObject(item.validate());
        });

        return RSVP.all(validationPromises).then(() => {
            navSetting = navItems.map((item) => {
                let label = item.get('label').trim();
                let url = item.get('url').trim();

                return {label, url};
            }).compact();

            this.set('model.navigation', JSON.stringify(navSetting));

            // trigger change event because even if the final JSON is unchanged
            // we need to have navigationItems recomputed.
            this.get('model').notifyPropertyChange('navigation');

            return this.get('model').save().catch((err) => {
                notifications.showErrors(err);
            });
        }).catch(() => {
            // TODO: noop - needed to satisfy spinner button
        });
    },

    addNewNavItem() {
        let navItems = this.get('navigationItems');
        let newNavItem = this.get('newNavItem');

        newNavItem.set('isNew', false);
        navItems.pushObject(newNavItem);
        this.set('newNavItem', NavItem.create({isNew: true}));
    },

    actions: {
        addItem() {
            let newNavItem = this.get('newNavItem');

            return newNavItem.validate().then(() => {
                this.addNewNavItem();
            });
        },

        deleteItem(item) {
            if (!item) {
                return;
            }

            let navItems = this.get('navigationItems');

            navItems.removeObject(item);
        },

        reorderItems(navItems) {
            this.set('navigationItems', navItems);
        },

        updateUrl(url, navItem) {
            if (!navItem) {
                return;
            }

            navItem.set('url', url);
        },

        reset() {
            this.set('newNavItem', NavItem.create({isNew: true}));
        }
    }
});
