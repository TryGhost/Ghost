const makeRoute = function (root, args) {
    const slashAtStart = /^\//;
    const slashAtEnd = /\/$/;
    const parts = Array.prototype.slice.call(args, 0);
    let route = root.replace(slashAtEnd, '');

    parts.forEach((part) => {
        if (part) {
            route = [route, part.replace(slashAtStart, '').replace(slashAtEnd, '')].join('/');
        }
    });

    return route += '/';
};

export default function () {
    const path = window.location.pathname;
    const subdir = path.substr(0, path.search('/ghost/'));
    const adminRoot = `${subdir}/ghost/`;
    const assetRoot = `${subdir}/ghost/assets/`;
    const apiRoot = `${subdir}/ghost/api/admin`;
    const assetRootWithHost = `${window.location.protocol}//${window.location.host}${assetRoot}`;

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
                    const [arg] = arguments;
                    return arg.slice(-1) === '/' ? arg : `${arg}/`;
                }
                return '/';
            }
        }
    };
}
