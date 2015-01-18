var NavigationController,
    NavItem;

NavItem = Ember.Object.extend({
    label: '',
    url: '',

    isComplete: Ember.computed('label', 'url', function () {
        return !(Ember.isBlank(this.get('label')) || Ember.isBlank(this.get('url')));
    })
});

NavigationController = Ember.Controller.extend({
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
            navItems.addObject(NavItem.create());
        }

        return navItems;
    }),

    navigationItemsObserver: Ember.observer('navigationItems.[]', function () {
        var navItems = this.get('navigationItems');

        navItems.forEach(function (item, index, items) {
            if (index === (items.length - 1)) {
                item.set('last', true);
            } else {
                item.set('last', false);
            }
        });
    }),

    actions: {
        addItem: function () {
            var navItems = this.get('navigationItems'),
                lastItem = navItems.get('lastObject');

            if (lastItem && lastItem.get('isComplete')) {
                navItems.addObject(NavItem.create());
            }
        },

        deleteItem: function (item) {
            if (!item) {
                return;
            }

            this.get('navigationItems').removeObject(item);
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
                match;

            navSetting = this.get('navigationItems').map(function (item) {
                var label,
                    url;

                if (!item || !item.get('isComplete')) {
                    return;
                }

                label = item.get('label').trim();
                url = item.get('url').trim();

                match = url.match(blogUrlRegex);

                if (match) {
                    if (match[1] === '') {
                        url = '/';
                    } else {
                        url = match[1];
                    }
                } else if (!validator.isURL(url) && url !== '' && url[0] !== '/') {
                    url = '/' + url;
                }

                // if navItem label is empty and URL is still the default, don't save
                if (!label && url === '/') {
                    return;
                }

                return {label: label, url: url};
            }).compact();

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
