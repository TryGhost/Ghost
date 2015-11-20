(function () {
    'use strict';

    function generateQueryString(object) {
        var url = '?',
            i;

        if (!object) {
            return '';
        }

        for (i in object) {
            if (object.hasOwnProperty(i) && (!!object[i] || object[i] === false)) {
                url += i + '=' + encodeURIComponent(object[i]) + '&';
            }
        }

        return url.substring(0, url.length - 1);
    }

    var url = {
        config: {
            url: '{{api_url}}',
            useOrigin: '{{useOrigin}}',
            origin: '',
            clientId: '',
            clientSecret: ''
        },

        api: function () {
            var args = Array.prototype.slice.call(arguments),
                url = ((this.config.useOrigin === 'true')) ? this.config.origin + this.config.url : this.config.url,
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
        url.config.origin = window.location.origin;
        url.config.clientId = document.querySelector('meta[property=\'ghost:client_id\']').content;
        url.config.clientSecret = document.querySelector('meta[property=\'ghost:client_secret\']').content;
        window.ghost = window.ghost || {};
        window.ghost.url = url;
    }
    if (typeof module !== 'undefined') {
        module.exports = url;
    }
})();
