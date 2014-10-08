
var endpoints = [
    {
        // /ghost/api/v0.1/posts/?status=published
        pathPattern: /^\/ghost\/api\/v0.1\/posts(\/)?$/,
        // white listed allowed verbs
        verbs: ['GET'],
        // white listed allowed parameters
        opts: [
            {status: 'published'}
        ]
    },
    {
        // /ghost/api/v0.1/posts/:id
        pathPattern: /^\/ghost\/api\/v0.1\/posts\/[0-9](\/)?$/,
        // white listed allowed verbs
        verbs: ['GET'],
        // white listed allowed parameters
        opts: [
            {status: 'published'}
        ]
    },
    {
        // /ghost/api/v0.1/posts/slug/:slug
        pathPattern: /^\/ghost\/api\/v0.1\/posts\/slug\/[a-zA-Z0-9\-]{1,}(\/)?$/,
        // white listed allowed verbs
        verbs: ['GET'],
        opts: [
            {status: 'published'}
        ]
    },
    {
        // /ghost/api/v0.1/users/:id/?status=active
        pathPattern: /^\/ghost\/api\/v0.1\/users\/[0-9](\/)?$/,
        // white listed allowed verbs
        verbs: ['GET'],
        // white listed allowed parameters
        opts: [
            {status: 'active'}
        ]
    },
    {
        // /ghost/api/v0.1/users/email/:email/
        // TODO: Use proper email regex here
        pathPattern:  /^\/ghost\/api\/v0.1\/users\/email\/.{1,}(\/)?$/,
        // white listed allowed verbs
        verbs: ['GET']
    },
    {
        // /ghost/api/v0.1/users/slug/:slug
        pathPattern: /^\/ghost\/api\/v0.1\/users\/slug\/[a-zA-Z0-9\-]{1,}(\/)?$/,
        // white listed allowed verbs
        verbs: ['GET']
    },
    {
        // /ghost/api/v0.1/tags/
        pathPattern: /^\/ghost\/api\/v0.1\/tags(\/)?$/,
        // white listed allowed verbs
        verbs: ['GET']
    },
    {
        // /ghost/api/v0.1/settings/?type=blog
        pathPattern: /^\/ghost\/api\/v0.1\/settings(\/)?$/,
        // white listed allowed verbs
        verbs: ['GET'],
        // white listed allowed parameters
        opts: [
            {type: 'blog'}
        ]
    },
    {
        // /ghost/api/v0.1/settings/:key/?type=blog
        pathPattern: /^\/ghost\/api\/v0.1\/settings\/[0-9a-zA-Z]{1,}(\/)?$/,
        // white listed allowed verbs
        verbs: ['GET'],
        // white listed allowed parameters
        opts: [
            {type: 'blog'}
        ]
    }
];

function isUsingPublicParams(endpoint, req) {
    var param,
        i,
        allowedParam;

    for (param in req.query) {
        if (req.query.hasOwnProperty(param)) {
            for (i = 0; i < endpoint.opts.length; i += 1) {
                allowedParam = endpoint.opts[ i ];
                if (allowedParam[param] && req.query[param] === allowedParam[param]) {
                    return true;
                }
            }
        }
    }
    return false;
}

function hasPublicVerb(endpoint, req) {
    return (endpoint.verbs.indexOf(req.method) > -1);
}

function isPathPublic(path) {
    var i,
        endpoint;

    for (i = 0; i < endpoints.length; i += 1) {
        endpoint = endpoints[i];
        if (endpoint.pathPattern.test(path)) {
            return endpoint;
        }
    }
}

exports.isPublic = function (req, path) {
    var endpoint = isPathPublic(path);
    if (endpoint && hasPublicVerb(endpoint, req) && isUsingPublicParams(endpoint, req)) {
        return true;
    }
    return false;
};
