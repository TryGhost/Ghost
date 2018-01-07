import TextField from '@ember/component/text-field';
import {InvokeActionMixin} from 'ember-invoke-action';
import {computed} from '@ember/object';
import {run} from '@ember/runloop';

// URI is attached to the window global as part of the
// google-caja html-css-sanitizer-bundle
const {URI} = window;

let joinUrlParts = function (url, path) {
    if (path[0] !== '/' && url.slice(-1) !== '/') {
        path = `/${path}`;
    } else if (path[0] === '/' && url.slice(-1) === '/') {
        path = path.slice(1);
    }

    return url + path;
};

let isRelative = function (url) {
    // "protocol://", "//example.com", "scheme:", "#anchor", & invalid paths
    // should all be treated as absolute
    return !url.match(/\s/) && !validator.isURL(url) && !url.match(/^(\/\/|#|[a-zA-Z0-9-]+:)/);
};

export default TextField.extend(InvokeActionMixin, {
    classNames: 'gh-input',

    isBaseUrl: computed('baseUrl', 'value', function () {
        return this.get('baseUrl') === this.get('value');
    }),

    didReceiveAttrs() {
        this._super(...arguments);

        let baseUrl = this.get('baseUrl');
        let url = this.get('url');

        // if we have a relative url, create the absolute url to be displayed in the input
        if (isRelative(url)) {
            url = joinUrlParts(baseUrl, url);
        }

        this.set('value', url);
    },

    focusIn(event) {
        this.set('hasFocus', true);

        if (this.get('isBaseUrl')) {
            // position the cursor at the end of the input
            run.next(function (el) {
                let {length} = el.value;

                el.setSelectionRange(length, length);
            }, event.target);
        }
    },

    keyDown(event) {
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

    keyPress(event) {
        this.invokeAction('clearErrors');

        // enter key
        if (event.keyCode === 13) {
            this.notifyUrlChanged();
        }

        return true;
    },

    focusOut() {
        this.set('hasFocus', false);

        this.notifyUrlChanged();
    },

    notifyUrlChanged() {
        let url = this.get('value').trim();
        let urlURI = URI.parse(url);
        let baseUrl = this.get('baseUrl');
        let baseURI = URI.parse(baseUrl);

        function getHost(uri) {
            let host = uri.getDomain();

            if (uri.getPort()) {
                host = `${host}:${uri.getPort()}`;
            }

            return host;
        }

        let urlHost = getHost(urlURI);
        let baseHost = getHost(baseURI);

        // ensure value property is trimmed
        this.set('value', url);

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

        // get our baseUrl relativity checks in order
        let isOnSameHost = urlHost === baseHost;
        let isAnchorLink = url.match(/^#/);
        let isRelativeToBasePath = urlURI.getPath() && urlURI.getPath().indexOf(baseURI.getPath()) === 0;

        // if our path is only missing a trailing / mark it as relative
        if (`${urlURI.getPath()}/` === baseURI.getPath()) {
            isRelativeToBasePath = true;
        }

        // if relative to baseUrl, remove the base url before sending to action
        if (!isAnchorLink && isOnSameHost && isRelativeToBasePath) {
            url = url.replace(/^[a-zA-Z0-9-]+:/, '');
            url = url.replace(/^\/\//, '');
            url = url.replace(baseHost, '');
            url = url.replace(baseURI.getPath(), '');

            // handle case where url path is same as baseUrl path but missing trailing slash
            if (urlURI.getPath().slice(-1) !== '/') {
                url = url.replace(baseURI.getPath().slice(0, -1), '');
            }

            if (url !== '' || !this.get('isNew')) {
                if (!url.match(/^\//)) {
                    url = `/${url}`;
                }

                if (!url.match(/\/$/) && !url.match(/[.#?]/)) {
                    url = `${url}/`;
                }
            }
        }

        let action = this.get('update');
        if (action) {
            action(url);
        }
    }
});
