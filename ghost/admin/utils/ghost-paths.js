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
        subdir = path.substr(0, path.search('/ghost/'));

    return {
        subdir: subdir,
        blogRoot: subdir + '/',
        adminRoot: subdir + '/ghost',
        apiRoot: subdir + '/ghost/api/v0.1',
        userImage: subdir + '/assets/img/user-image.png',
        errorImageSrc: subdir + '/ghost/img/404-ghost@2x.png',
        errorImageSrcSet: subdir + '/ghost/img/404-ghost.png 1x, ' + subdir + '/ghost/img/404-ghost@2x.png 2x',

        adminUrl: function () {
            return makeRoute(this.adminRoot, arguments);
        },

        apiUrl: function () {
            return makeRoute(this.apiRoot, arguments);
        }
    };
}

export default ghostPaths;
