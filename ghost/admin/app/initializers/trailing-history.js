import HistoryLocation from 'ember-locations/history';

let trailingHistory = HistoryLocation.extend({
    formatURL() {
        let url = this._super(...arguments);

        if (url.indexOf('?') > 0) {
            return url.replace(/([^\/])\?/, '$1/?');
        } else {
            return url.replace(/\/?$/, '/');
        }
    }
});

export default {
    name: 'registerTrailingLocationHistory',

    initialize(application) {
        application.register('location:trailing-history', trailingHistory);
    }
};
