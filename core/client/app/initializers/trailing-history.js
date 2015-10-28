import Ember from 'ember';

const {HistoryLocation} = Ember;

let trailingHistory = HistoryLocation.extend({
    formatURL() {
        return this._super.apply(this, arguments).replace(/\/?$/, '/');
    }
});

export default {
    name: 'registerTrailingLocationHistory',

    initialize(registry, application) {
        application.register('location:trailing-history', trailingHistory);
    }
};
