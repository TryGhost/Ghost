import Ember from 'ember';

const {
    computed,
    isBlank
} = Ember;

export default Ember.Object.extend({
    url: '',
    isActive: false,

    isComplete: computed('url', function () {
        let {url} = this.getProperties('url');

        return !isBlank(url);
    }),

    isBlank: computed('url', function () {
        let {url} = this.getProperties('url');

        return isBlank(url);
    }),

    isActivated: computed('isActive', function () {
        let {isActive} = this.getProperties('isActive');

        return isActive;
    })
});
