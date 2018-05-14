import Component from '@ember/component';
import moment from 'moment';
import {computed} from '@ember/object';

export default Component.extend({
    tagName: '',

    user: null,

    lastLoginUTC: computed('user.lastLoginUTC', function () {
        let lastLoginUTC = this.get('user.lastLoginUTC');

        return lastLoginUTC ? moment(lastLoginUTC).fromNow() : '(Never)';
    })
});
