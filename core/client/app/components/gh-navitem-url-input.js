import Ember from 'ember';

var joinUrlParts,
    isRelative;

joinUrlParts = function (url, path) {
    if (path[0] !== '/' && url.slice(-1) !== '/') {
        path = '/' + path;
    } else if (path[0] === '/' && url.slice(-1) === '/') {
        path = path.slice(1);
    }

    return url + path;
};

isRelative = function (url) {
    // "protocol://", "//example.com", "scheme:", "#anchor", & invalid paths
    // should all be treated as absolute
    return !url.match(/\s/) && !validator.isURL(url) && !url.match(/^(\/\/|#|[a-zA-Z0-9\-]+:)/);
};

export default Ember.TextField.extend({
    classNames: 'gh-input',
    classNameBindings: ['fakePlaceholder'],

    didReceiveAttrs: function () {
        var url = this.get('url'),
            baseUrl = this.get('baseUrl');

        // if we have a relative url, create the absolute url to be displayed in the input
        if (isRelative(url)) {
            url = joinUrlParts(baseUrl, url);
        }

        this.set('value', url);
    },

    isBaseUrl: Ember.computed('baseUrl', 'value', function () {
        return this.get('baseUrl') === this.get('value');
    }),

    fakePlaceholder: Ember.computed('isBaseUrl', 'hasFocus', function () {
        return this.get('isBaseUrl') && this.get('last') && !this.get('hasFocus');
    }),

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

        // CMD-S
        if (event.keyCode === 83 && event.metaKey) {
            this.notifyUrlChanged();
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
            urlParts = document.createElement('a'),
            baseUrl = this.get('baseUrl'),
            baseUrlParts = document.createElement('a');

        // leverage the browser's native URI parsing
        urlParts.href = url;
        baseUrlParts.href = baseUrl;

        // if we have an email address, add the mailto:
        if (validator.isEmail(url)) {
            url = `mailto:${url}`;
            this.set('value', url);
        }

        // if we have a relative url, create the absolute url to be displayed in the input
        if (isRelative(url)) {
            url = joinUrlParts(baseUrl, url);
            this.set('value', url);
        }

        // remove the base url before sending to action
        if (urlParts.host === baseUrlParts.host && !url.match(/^#/)) {
            url = url.replace(/^[a-zA-Z0-9\-]+:/, '');
            url = url.replace(/^\/\//, '');
            url = url.replace(baseUrlParts.host, '');
            url = url.replace(baseUrlParts.pathname, '');
            if (!url.match(/^\//)) {
                url = '/' + url;
            }
        }

        this.sendAction('change', url);
    }
});
