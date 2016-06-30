import Component from 'ember-component';
import computed from 'ember-computed';
import injectService from 'ember-service/inject';
import {htmlSafe} from 'ember-string';

export default Component.extend({
    tagName: '',

    user: null,

    ghostPaths: injectService(),

    userDefault: computed('ghostPaths', function () {
        return `${this.get('ghostPaths.subdir')}/ghost/img/user-image.png`;
    }),

    userImageBackground: computed('user.image', 'userDefault', function () {
        let url = this.get('user.image') || this.get('userDefault');

        return htmlSafe(`background-image: url(${url})`);
    }),

    lastLoginUTC: computed('user.lastLoginUTC', function () {
        let lastLoginUTC = this.get('user.lastLoginUTC');

        return lastLoginUTC ? moment(lastLoginUTC).fromNow() : '(Never)';
    })
});
