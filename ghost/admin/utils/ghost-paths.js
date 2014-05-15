var makeRoute = function (root, args) {
    var parts = Array.prototype.slice.call(args, 0).join('/'),
        route = [root, parts].join('/');

    if (route.slice(-1) !== '/') {
        route += '/';
    }

    return route;
};

export default function ghostPaths() {
    var path = window.location.pathname,
        subdir = path.substr(0, path.search('/ghost/'));

    return {
        subdir: subdir,
        adminRoot: subdir + '/ghost',
        apiRoot: subdir + '/ghost/api/v0.1',

        adminUrl: function () {
            return makeRoute(this.adminRoot, arguments);
        },

        apiUrl: function () {
            return makeRoute(this.apiRoot, arguments);
        }
    };
}