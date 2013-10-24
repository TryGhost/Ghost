var _ = require('underscore'),
    when = require('when'),
    http = require('http'),
    HttpMethods,
    ApiRouteBase = '/ghost/api/v0.1/';

HttpMethods = {
    GET: 'GET',
    POST: 'POST',
    PUT: 'PUT',
    DELETE: 'DELETE'
};

function createRequest(httpMethod, overrides) {
    return _.defaults(overrides, {
        'host': 'localhost',
        'port': '2369',
        'method': httpMethod
    });
}

function post(route, data, authCookie) {
    var jsonData = JSON.stringify(data),
        options = createRequest(HttpMethods.POST, {
            path: route,
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': jsonData.length
            }
        }),
        req,
        response = '',
        deferred = when.defer();

    if (authCookie) {
        options.headers['Cookie'] = authCookie;
    }

    req = http.request(options, function (res) {
        res.setEncoding('utf-8');

        if (res.statusCode === 401) {
            return deferred.resolver.reject(new Error('401 Unauthorized.'));
        }

        res.on('data', function (chunk) {
            response += chunk;
        });

        res.on('end', function () {
            deferred.resolver.resolve({ 
                headers: res.headers,
                response: JSON.parse(response)
            });
        });
    }).on('error', deferred.resolver.reject);

    req.write(jsonData);
    req.end();

    return deferred.promise;
}

function get(route, authCookie) {
    var options = createRequest(HttpMethods.GET, {
            path: route,
            headers: {}
        }),
        response = '',
        deferred = when.defer();

    if (authCookie) {
        options.headers['Cookie'] = authCookie;
    }

    http.get(options, function (res) {
        res.setEncoding('utf-8');

        if (res.statusCode === 401) {
            return deferred.resolver.reject(new Error('401 Unauthorized.'));
        }

        res.on('data', function (chunk) {
            response += chunk;
        });

        res.on('end', function () {
            deferred.resolve({
                headers: res.headers,
                response: JSON.parse(response)
            });
        });
    }).on('error', deferred.resolver.reject);

    return deferred.promise;
}

function login(email, password) {
    var data = {
        email: email,
        password: password
    };

    return post('/ghost/signin/', data).then(function (response) {
        return response.headers['set-cookie'];
    });
}

module.exports = {
    HttpMethods: HttpMethods,
    ApiRouteBase: ApiRouteBase,

    createRequest: createRequest,
    post: post,
    get: get,

    login: login
};