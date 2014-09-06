/*global Ember */

var trailingHistory = Ember.HistoryLocation.extend({
    formatURL: function () {
        var path = this._super.apply(this, arguments),
            reQuery = /[\?\&]+/,
            paths;

        paths = path.split(reQuery);

        if (paths[0].slice(-1) !== '/') {
            path = paths[0] + '/';
        } else {
            path = paths[0];
        }

        if (paths.length > 1) {
            path += '?' + paths[1];
        }

        return path;
    }
});

var registerTrailingLocationHistory = {
    name: 'registerTrailingLocationHistory',

    initialize: function (container, application) {
        application.register('location:trailing-history', trailingHistory);
    }
};

export default registerTrailingLocationHistory;