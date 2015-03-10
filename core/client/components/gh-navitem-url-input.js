function joinUrlParts(url, path) {
    if (path[0] !== '/' && url.slice(-1) !== '/') {
        path = '/' + path;
    } else if (path[0] === '/' && url.slice(-1) === '/') {
        path = path.slice(1);
    }

    return url + path;
}

var NavItemUrlInputComponent = Ember.TextField.extend({
    classNameBindings: ['fakePlaceholder'],

    isBaseUrl: Ember.computed('baseUrl', 'value', function () {
        return this.get('baseUrl') === this.get('value');
    }),

    fakePlaceholder: Ember.computed('isBaseUrl', 'hasFocus', function () {
        return this.get('isBaseUrl') && this.get('last') && !this.get('hasFocus');
    }),

    isRelative: Ember.computed('value', function () {
        return !validator.isURL(this.get('value')) && this.get('value').indexOf('mailto:') !== 0;
    }),

    didInsertElement: function () {
        var url = this.get('url'),
            baseUrl = this.get('baseUrl');

        this.set('value', url);

        // if we have a relative url, create the absolute url to be displayed in the input
        if (this.get('isRelative')) {
            url = joinUrlParts(baseUrl, url);
            this.set('value', url);
        }
    },

    focusIn: function (event) {
        this.set('hasFocus', true);

        if (this.get('isBaseUrl')) {
            // position the cursor at the end of the input
            Ember.run.next(function (el) {
                var length = el.value.length;

                el.setSelectionRange(length, length);
            }, event.target);
        }
    },

    keyDown: function (event) {
        // delete the "placeholder" value all at once
        if (this.get('isBaseUrl') && (event.keyCode === 8 || event.keyCode === 46)) {
            this.set('value', '');

            event.preventDefault();
        }
    },

    keyPress: function (event) {
        // enter key
        if (event.keyCode === 13) {
            event.preventDefault();
            this.notifyUrlChanged();
        }

        return true;
    },

    focusOut: function () {
        this.set('hasFocus', false);

        this.notifyUrlChanged();
    },

    notifyUrlChanged: function () {
        this.set('value', this.get('value').trim());

        var url = this.get('value'),
            baseUrl = this.get('baseUrl');

        // if we have a relative url, create the absolute url to be displayed in the input
        if (this.get('isRelative')) {
            this.set('value', joinUrlParts(baseUrl, url));
        }

        this.sendAction('change', url);
    }
});

export default NavItemUrlInputComponent;
