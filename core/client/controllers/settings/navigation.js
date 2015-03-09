var NavigationController,
    NavItem;

NavItem = Ember.Object.extend({
    label: '',
    url: '',
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
                message = 'One of your navigation items has an empty label. ' +
                    '<br /> Please enter a new label or delete the item before saving.',
                match;

            // Don't save if there's a blank label.
            if (navItems.find(function (item) { return !item.get('isComplete') && !item.get('last');})) {
                self.notifications.showErrors([message.htmlSafe()]);
                return;
            }

            navSetting = navItems.map(function (item) {
                var label,
                    url;

                if (!item || !item.get('isComplete')) {
                    return;
                }

                label = item.get('label').trim();
                url = item.get('url').trim();

                // is this an internal URL?
                match = url.match(blogUrlRegex);

                if (match) {
                    url = match[1];

                    // if the last char is not a slash, then add one,
                    // as long as there is no # or . in the URL (anchor or file extension)
                    // this also handles the empty case for the homepage
                    if (url[url.length - 1] !== '/' && url.indexOf('#') === -1 && url.indexOf('.') === -1) {
                        url += '/';
                    }
                } else if (!validator.isURL(url) && url !== '' && url[0] !== '/' && url.indexOf('mailto:') !== 0) {
                    url = '/' + url;
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
