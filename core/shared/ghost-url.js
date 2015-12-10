(function () {
    'use strict';

    function generateQueryString(object) {
        var queries = [],
            i;

        if (!object) {
            return '';
        }

        for (i in object) {
            if (object.hasOwnProperty(i) && (!!object[i] || object[i] === false)) {
                queries.push(i + '=' + encodeURIComponent(object[i]));
            }
        }

        if (queries.length) {
            return '?' + queries.join('&');
        }
        return '';
    }

    var url = {
        config: {},

        api: function () {
            var args = Array.prototype.slice.call(arguments),
                url = (this.config.useOrigin) ? this.config.origin + this.config.url : this.config.url,
                queryOptions;

            if (args.length && typeof args[args.length - 1] === 'object') {
                queryOptions = args.pop();
            } else {
                queryOptions = {};
            }

            queryOptions.client_id = this.config.clientId;
            queryOptions.client_secret = this.config.clientSecret;

            if (args.length) {
                args.forEach(function (el) {
                    url += el.replace(/^\/|\/$/g, '') + '/';
                });
            }

            return url + generateQueryString(queryOptions);
        }
    };

    if (typeof window !== 'undefined') {
        window.ghost = window.ghost || {};
        url.config = window.ghost.config || {};
        window.ghost.url = url;
    }

    if (typeof module !== 'undefined') {
        module.exports = url;
    }
})();
