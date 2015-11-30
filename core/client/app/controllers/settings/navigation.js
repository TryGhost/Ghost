import Ember from 'ember';
import DS from 'ember-data';
import SettingsSaveMixin from 'ghost/mixins/settings-save';
import ValidationEngine from 'ghost/mixins/validation-engine';

const {Controller, RSVP, computed, inject, isBlank, observer} = Ember;
const {Errors} = DS;
const emberA = Ember.A;

export const NavItem = Ember.Object.extend(ValidationEngine, {
    label: '',
    url: '',
    last: false,

    validationType: 'navItem',

    isComplete: computed('label', 'url', function () {
        return !(isBlank(this.get('label').trim()) || isBlank(this.get('url')));
    }),

    init() {
        this._super(...arguments);
        this.set('errors', Errors.create());
        this.set('hasValidated', emberA());
    }
});

export default Controller.extend(SettingsSaveMixin, {
    config: inject.service(),
    notifications: inject.service(),

    blogUrl: computed('config.blogUrl', function () {
        let url = this.get('config.blogUrl');

        return url.slice(-1) !== '/' ? `${url}/` : url;
    }),

    navigationItems: computed('model.navigation', function () {
        let lastItem,
            navItems;

        try {
            navItems = JSON.parse(this.get('model.navigation') || [{}]);
        } catch (e) {
            navItems = [{}];
        }

        navItems = navItems.map((item) => {
            return NavItem.create(item);
        });

        lastItem = navItems.get('lastObject');
        if (!lastItem || lastItem.get('isComplete')) {
            navItems.addObject(NavItem.create({last: true}));
        }

        return navItems;
    }),

    updateLastNavItem: observer('navigationItems.[]', function () {
        let navItems = this.get('navigationItems');

        navItems.forEach((item, index, items) => {
            if (index === (items.length - 1)) {
                item.set('last', true);
            } else {
                item.set('last', false);
            }
        });
    }),

    save() {
        let navItems = this.get('navigationItems');
        let notifications = this.get('notifications');
        let navSetting,
            validationPromises;

        validationPromises = navItems.map((item) => {
            return item.validate();
        });

        return RSVP.all(validationPromises).then(() => {
            navSetting = navItems.map((item) => {
                let label = item.get('label').trim();
                let url = item.get('url').trim();

                if (item.get('last') && !item.get('isComplete')) {
                    return null;
                }

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

    actions: {
        addItem() {
            let navItems = this.get('navigationItems');
            let lastItem = navItems.get('lastObject');

            if (lastItem && lastItem.get('isComplete')) {
                // Add new blank navItem
                navItems.addObject(NavItem.create({last: true}));
            }
        },

        deleteItem(item) {
            if (!item) {
                return;
            }

            let navItems = this.get('navigationItems');

            navItems.removeObject(item);
        },

        moveItem(index, newIndex) {
            let navItems = this.get('navigationItems');
            let item = navItems.objectAt(index);

            navItems.removeAt(index);
            navItems.insertAt(newIndex, item);
        },

        updateUrl(url, navItem) {
            if (!navItem) {
                return;
            }

            navItem.set('url', url);
        }
    }
});
