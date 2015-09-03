import Ember from 'ember';
/*global Ember */

var trailingHistory = Ember.HistoryLocation.extend({
    formatURL: function () {
        // jscs: disable
        return this._super.apply(this, arguments).replace(/\/?$/, '/');
        // jscs: enable
    }
});

export default {
    name: 'registerTrailingLocationHistory',

    initialize: function (registry, application) {
        application.register('location:trailing-history', trailingHistory);
    }
};
