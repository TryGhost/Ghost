var makeRoute = function (root, args) {
    var parts = Array.prototype.slice.call(args, 0).join('/'),
        route = [root, parts].join('/');

    if (route.slice(-1) !== '/') {
        route += '/';
    }

    return route;
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
        userImage: assetUrl('/assets/img/user-image.png'),
        errorImageSrc: assetUrl('/ghost/img/404-ghost@2x.png'),
        errorImageSrcSet: assetUrl('/ghost/img/404-ghost.png') + ' 1x, ' +
            assetUrl('/ghost/img/404-ghost@2x.png') + ' 2x',

        url: {
            admin: function () {
                return makeRoute(adminRoot, arguments);
            },

            api: function () {
                return makeRoute(apiRoot, arguments);
            },

            asset: assetUrl
        }
    };
}

export default ghostPaths;
