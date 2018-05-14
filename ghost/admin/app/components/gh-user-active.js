import Component from '@ember/component';
import moment from 'moment';
import {computed} from '@ember/object';
import {htmlSafe} from '@ember/string';

export default Component.extend({
    tagName: '',

    user: null,

    userImageBackground: computed('user.profileImageUrl', function () {
        let url = encodeURI(decodeURI(this.user.get('profileImageUrl')));
        return htmlSafe(`background-image: url(${url})`);
    }),

    lastLoginUTC: computed('user.lastLoginUTC', function () {
        let lastLoginUTC = this.get('user.lastLoginUTC');

        return lastLoginUTC ? moment(lastLoginUTC).fromNow() : '(Never)';
    })
});
