/*global Ember */

var trailingHistory = Ember.HistoryLocation.extend({
    formatURL: function () {
        return this._super.apply(this, arguments).replace(/\/?$/, '/');
    }
});

var registerTrailingLocationHistory = {
    name: 'registerTrailingLocationHistory',

    initialize: function (container, application) {
        application.register('location:trailing-history', trailingHistory);
    }
};

export default registerTrailingLocationHistory;