let makeRoute = function (root, args) {
    let slashAtStart = /^\//;
    let slashAtEnd = /\/$/;
    let parts = Array.prototype.slice.call(args, 0);
    let route = root.replace(slashAtEnd, '');

    parts.forEach((part) => {
        if (part) {
            route = [route, part.replace(slashAtStart, '').replace(slashAtEnd, '')].join('/');
        }
    });

    return route += '/';
};

export default function () {
    let path = window.location.pathname;
    let subdir = path.substr(0, path.search('/ghost/'));
    let adminRoot = `${subdir}/ghost/`;
    let assetRoot = `${subdir}/ghost/assets/`;
    let apiRoot = `${subdir}/ghost/api/admin`;
    let assetRootWithHost = `${window.location.protocol}//${window.location.host}${assetRoot}`;

    return {
        assetRootWithHost,
        adminRoot,
        assetRoot,
        apiRoot,
        subdir,
        blogRoot: `${subdir}/`,

        url: {
            admin() {
                return makeRoute(adminRoot, arguments);
            },

            api() {
                return makeRoute(apiRoot, arguments);
            },

            join() {
                if (arguments.length > 1) {
                    return makeRoute(arguments[0], Array.prototype.slice.call(arguments, 1));
                } else if (arguments.length === 1) {
                    let [arg] = arguments;
                    return arg.slice(-1) === '/' ? arg : `${arg}/`;
                }
                return '/';
            }
        }
    };
}
