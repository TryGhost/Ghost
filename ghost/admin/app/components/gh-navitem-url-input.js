import TextField from '@ember/component/text-field';
import classic from 'ember-classic-decorator';
import validator from 'validator';
import {classNames} from '@ember-decorators/component';
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

@classic
@classNames('gh-input')
export default class GhNavitemUrlInput extends TextField {
    // Allowed actions
    update() {}

    clearErrors() {}

    @computed('baseUrl', 'value')
    get isBaseUrl() {
        return this.baseUrl === this.value;
    }

    didReceiveAttrs() {
        super.didReceiveAttrs(...arguments);
        // value coming is likely to be relative but we always want to show
        // absolute urls in the input fields
        this.set('value', this._makeAbsoluteUrl(this.url));
    }

    focusIn(event) {
        this.set('hasFocus', true);

        if (this.isBaseUrl) {
            // position the cursor at the end of the input
            run.next(function (el) {
                let {length} = el.value;

                el.setSelectionRange(length, length);
            }, event.target);
        }
    }

    keyDown(event) {
        // delete the "placeholder" value all at once
        if (this.isBaseUrl && (event.keyCode === 8 || event.keyCode === 46)) {
            this.set('value', '');

            event.preventDefault();
        }

        // CMD-S
        if (event.keyCode === 83 && event.metaKey) {
            this.notifyUrlChanged();
        }
    }

    keyPress(event) {
        this.clearErrors();

        // enter key
        if (event.keyCode === 13) {
            this.notifyUrlChanged();
        }

        return true;
    }

    focusOut() {
        this.set('hasFocus', false);

        this.notifyUrlChanged();
    }

    notifyUrlChanged() {
        let url = this.value.trim();
        let urlURI = URI.parse(url);
        let baseUrl = this.baseUrl;
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
            url = this.update(`mailto:${url}`);
            this.set('value', url);
            return;
        }

        // get our baseUrl relativity checks in order
        let isAnchorLink = url.match(/^#/);
        let isRelativeToBasePath = urlURI.getPath() && urlURI.getPath().indexOf(baseURI.getPath()) === 0;

        // if our path is only missing a trailing / mark it as relative
        if (`${urlURI.getPath()}/` === baseURI.getPath()) {
            isRelativeToBasePath = true;
        }

        let isOnSameHost = urlHost === baseHost || (!urlHost && isRelativeToBasePath);

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

            if (url !== '' || !this.isNew) {
                if (!url.match(/^\//)) {
                    url = `/${url}`;
                }

                if (!url.match(/\/$/) && !url.match(/[.#?]/)) {
                    url = `${url}/`;
                }
            }
        }

        // we update with the relative URL but then transform it back to absolute
        // for the input value. This avoids problems where the underlying relative
        // value hasn't changed even though the input value has
        if (url.match(/^(\/\/|#|[a-zA-Z0-9-]+:)/) || validator.isURL(url) || validator.isURL(`${baseHost}${url}`)) {
            url = this.update(url);
            this.set('value', this._makeAbsoluteUrl(url));
        }
    }

    _makeAbsoluteUrl(url) {
        if (isRelative(url)) {
            url = joinUrlParts(this.baseUrl, url);
        }
        return url;
    }
}
