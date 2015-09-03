var makeRoute = function (root, args) {
    var slashAtStart,
        slashAtEnd,
        parts,
        route;

    slashAtStart = /^\//;
    slashAtEnd = /\/$/;
    route = root.replace(slashAtEnd, '');
    parts = Array.prototype.slice.call(args, 0);

    parts.forEach(function (part) {
        if (part) {
            route = [route, part.replace(slashAtStart, '').replace(slashAtEnd, '')].join('/');
        }
    });
    return route += '/';
};

function ghostPaths() {
    var path = window.location.pathname,
        subdir = path.substr(0, path.search('/ghost/')),
        adminRoot = subdir + '/ghost',
        apiRoot = subdir + '/ghost/api/v0.1';

    function assetUrl(src) {
        return subdir + src;
    }

    return {
        subdir: subdir,
        blogRoot: subdir + '/',
        adminRoot: adminRoot,
        apiRoot: apiRoot,

        url: {
            admin: function () {
                return makeRoute(adminRoot, arguments);
            },

            api: function () {
                return makeRoute(apiRoot, arguments);
            },

            join: function () {
                if (arguments.length > 1) {
                    return makeRoute(arguments[0], Array.prototype.slice.call(arguments, 1));
                } else if (arguments.length === 1) {
                    var arg = arguments[0];
                    return arg.slice(-1) === '/' ? arg : arg + '/';
                }
                return '/';
            },

            asset: assetUrl
        },
        count: 'https://ghost.org/count/'
    };
}

export default ghostPaths;
