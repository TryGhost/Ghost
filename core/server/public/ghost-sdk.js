(function () {
        var apiUrl = '{{api-url}}',
        clientId,
        clientSecret,
        url,
        init;

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

    url = {
        api: function () {
            var args = Array.prototype.slice.call(arguments),
                queryOptions,
                requestUrl = apiUrl;

            queryOptions = args.pop();

            if (queryOptions && typeof queryOptions !== 'object') {
                args.push(queryOptions);
                queryOptions = {};
            }

            queryOptions = queryOptions || {};

            queryOptions.client_id = clientId;
            queryOptions.client_secret = clientSecret;

            if (args.length) {
                args.forEach(function (el) {
                    requestUrl += el.replace(/^\/|\/$/g, '') + '/';
                });
            }

            return requestUrl + generateQueryString(queryOptions);
        }
    };

    init = function (options) {
        clientId = options.clientId ? options.clientId : '';
        clientSecret = options.clientSecret ? options.clientSecret : '';
        apiUrl = options.url ? options.url : (apiUrl.match(/{\{api-url}}/) ? '' : apiUrl);
    };

    if (typeof window !== 'undefined') {
        window.ghost = window.ghost || {};
        window.ghost.url = url;
        window.ghost.init = init;
    }

    if (typeof module !== 'undefined') {
        module.exports = {
            url: url,
            init: init
        };
    }
})();
