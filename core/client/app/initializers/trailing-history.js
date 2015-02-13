import Ember from 'ember';
/*global Ember */

var trailingHistory,
    registerTrailingLocationHistory;

trailingHistory = Ember.HistoryLocation.extend({
    formatURL: function () {
        // jscs: disable
        return this._super.apply(this, arguments).replace(/\/?$/, '/');
        // jscs: enable
    }
});

registerTrailingLocationHistory = {
    name: 'registerTrailingLocationHistory',

    initialize: function (container, application) {
        application.register('location:trailing-history', trailingHistory);
    }
};

export default registerTrailingLocationHistory;
