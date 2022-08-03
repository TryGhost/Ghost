import HashLocation from '@ember/routing/hash-location';

let trailingHash = HashLocation.extend({
    formatURL() {
        let url = this._super(...arguments);

        if (url.indexOf('?') > 0) {
            return url.replace(/([^/])\?/, '$1/?');
        } else {
            return url.replace(/\/?$/, '/');
        }
    }
});

export default {
    name: 'registerTrailingHashLocation',

    initialize(application) {
        application.register('location:trailing-hash', trailingHash);
    }
};
