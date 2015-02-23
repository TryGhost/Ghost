var NavigationController,
    NavItem;

NavItem = Ember.Object.extend({
    label: '',
    url: '',
    order: '',
    last: false,

    isComplete: Ember.computed('label', 'url', function () {
        return !(Ember.isBlank(this.get('label').trim()) || Ember.isBlank(this.get('url')));
    })
});

NavigationController = Ember.Controller.extend({
    blogUrl: Ember.computed('config.blogUrl', function () {
        var url = this.get('config.blogUrl');

        return url.slice(-1) !== '/' ? url + '/' : url;
    }),

    navigationItems: Ember.computed('model.navigation', function (key, value) {
        if (arguments.length > 1) {
            return value.sortBy('order');
        }
        var order = 0,
            navItems,
            lastItem;
        try {
            navItems = JSON.parse(this.get('model.navigation') || [{}]);
        } catch (e) {
            navItems = [{}];
        }

        navItems = navItems.map(function (item) {
            item.order = order;
            order = order + 1;
            return NavItem.create(item);
        });

        navItems.sortBy('order');

        lastItem = navItems.get('lastObject');
        if (!lastItem || lastItem.get('isComplete')) {
            navItems.addObject(NavItem.create());
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

    // called by the view after items have been rearranged
    updateOrder: function (indexes) {
        var navItems = this.get('navigationItems');

        indexes.forEach(function (index, newOrder) {
            navItems.objectAt(index).set('order', newOrder);
        });
    },

    actions: {
        addItem: function () {
            var navItems = this.get('navigationItems'),
                lastItem = navItems.get('lastObject');

            if (lastItem && lastItem.get('isComplete')) {
                lastItem.set('order', (navItems.length - 1)); // -1 because order is 0-index, length is 1-index
                navItems.addObject(NavItem.create()); // Adds new blank navItem
            }
        },

        deleteItem: function (item) {
            if (!item) {
                return;
            }
            var deletedItemOrder = item.get('order'),
                navItems = this.get('navigationItems');

            navItems.removeAt(navItems.indexOf(item));

            navItems.forEach(function (item) {
                if (!item.last && item.get('order') > deletedItemOrder) {
                    item.decrementProperty('order');
                }
            });

            this.set('navigationItems', navItems);
        },

        updateUrl: function (url, navItem) {
            if (!navItem) {
                return;
            }

            if (Ember.isBlank(url)) {
                navItem.set('url', this.get('blogUrl'));

                return;
            }

            navItem.set('url', url);
        },

        save: function () {
            var self = this,
                navSetting,
                blogUrl = this.get('config').blogUrl,
                blogUrlRegex = new RegExp('^' + blogUrl + '(.*)', 'i'),
                navItems = this.get('navigationItems'),
                lastItem = navItems.get('lastObject'),
                match;
            // Don't save if there's a blank label.
            if (navItems.find(function (item) { return !item.get('isComplete') && !item.get('last');})) {
                self.notifications.showErrors(['One of your navigation items has an empty label.<br>Please enter a new label or delete the item before saving.']);
                return;
            }
            // The last item is typically ignored in ordering, give it
            // the last spot in case it has a label & url and hasn't been
            // added yet.
            if (lastItem.get('order') !== 0 && !lastItem.get('order')) {
                lastItem.set('order', navItems.length);
            }
            navSetting = navItems.map(function (item) {
                var label,
                    url,
                    order;

                if (!item || !item.get('isComplete')) {
                    return;
                }

                label = item.get('label').trim();
                url = item.get('url').trim();
                order = item.get('order');

                // is this an internal URL?
                match = url.match(blogUrlRegex);

                if (match) {
                    url = match[1];

                    // if the last char is not a slash, then add one,
                    // this also handles the empty case for the homepage
                    if (url[url.length - 1] !== '/') {
                        url += '/';
                    }
                } else if (!validator.isURL(url) && url !== '' && url[0] !== '/') {
                    url = '/' + url;
                }

                return {label: label, url: url, order: order};
            }).compact();
            // Sort JSON so nav items are stored in the correct order
            navSetting.sort(function (a, b) {
                return a.order - b.order;
            });

            this.set('model.navigation', JSON.stringify(navSetting));

            // trigger change event because even if the final JSON is unchanged
            // we need to have navigationItems recomputed.
            this.get('model').notifyPropertyChange('navigation');

            this.notifications.closePassive();

            this.get('model').save().then(function () {
                self.notifications.showSuccess('Navigation items saved.');
            }).catch(function (err) {
                self.notifications.showErrors(err);
            });
        }
    }
});

export default NavigationController;
