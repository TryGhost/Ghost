import Ember from 'ember';
import DS from 'ember-data';
import SettingsSaveMixin from 'ghost/mixins/settings-save';
import ValidationEngine from 'ghost/mixins/validation-engine';

export const NavItem = Ember.Object.extend(ValidationEngine, {
    label: '',
    url: '',
    last: false,

    validationType: 'navItem',

    isComplete: Ember.computed('label', 'url', function () {
        return !(Ember.isBlank(this.get('label').trim()) || Ember.isBlank(this.get('url')));
    }),

    init: function () {
        this._super(...arguments);
        this.set('errors', DS.Errors.create());
        this.set('hasValidated', Ember.A());
    }
});

export default Ember.Controller.extend(SettingsSaveMixin, {
    config: Ember.inject.service(),
    notifications: Ember.inject.service(),

    blogUrl: Ember.computed('config.blogUrl', function () {
        var url = this.get('config.blogUrl');

        return url.slice(-1) !== '/' ? url + '/' : url;
    }),

    navigationItems: Ember.computed('model.navigation', function () {
        var navItems,
            lastItem;

        try {
            navItems = JSON.parse(this.get('model.navigation') || [{}]);
        } catch (e) {
            navItems = [{}];
        }

        navItems = navItems.map(function (item) {
            return NavItem.create(item);
        });

        lastItem = navItems.get('lastObject');
        if (!lastItem || lastItem.get('isComplete')) {
            navItems.addObject(NavItem.create({last: true}));
        }

        return navItems;
    }),

    updateLastNavItem: Ember.observer('navigationItems.[]', function () {
        var navItems = this.get('navigationItems');

        navItems.forEach(function (item, index, items) {
            if (index === (items.length - 1)) {
                item.set('last', true);
            } else {
                item.set('last', false);
            }
        });
    }),

    save: function () {
        var navSetting,
            navItems = this.get('navigationItems'),
            notifications = this.get('notifications'),
            validationPromises,
            self = this;

        validationPromises = navItems.map(function (item) {
            return item.validate();
        });

        return Ember.RSVP.all(validationPromises).then(function () {
            navSetting = navItems.map(function (item) {
                var label = item.get('label').trim(),
                    url = item.get('url').trim();

                if (item.get('last') && !item.get('isComplete')) {
                    return null;
                }

                return {label: label, url: url};
            }).compact();

            self.set('model.navigation', JSON.stringify(navSetting));

            // trigger change event because even if the final JSON is unchanged
            // we need to have navigationItems recomputed.
            self.get('model').notifyPropertyChange('navigation');

            return self.get('model').save().catch(function (err) {
                notifications.showErrors(err);
            });
        }).catch(function () {
            // TODO: noop - needed to satisfy spinner button
        });
    },

    actions: {
        addItem: function () {
            var navItems = this.get('navigationItems'),
                lastItem = navItems.get('lastObject');

            if (lastItem && lastItem.get('isComplete')) {
                navItems.addObject(NavItem.create({last: true})); // Adds new blank navItem
            }
        },

        deleteItem: function (item) {
            if (!item) {
                return;
            }

            var navItems = this.get('navigationItems');

            navItems.removeObject(item);
        },

        moveItem: function (index, newIndex) {
            var navItems = this.get('navigationItems'),
                item = navItems.objectAt(index);

            navItems.removeAt(index);
            navItems.insertAt(newIndex, item);
        },

        updateUrl: function (url, navItem) {
            if (!navItem) {
                return;
            }

            navItem.set('url', url);
        }
    }
});
