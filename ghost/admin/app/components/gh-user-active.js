import Component from 'ember-component';
import Ember from 'ember';
import computed from 'ember-computed';
import injectService from 'ember-service/inject';
import moment from 'moment';
import {htmlSafe} from 'ember-string';

// ember-cli-shims doesn't export these
const {Handlebars} = Ember;

export default Component.extend({
    tagName: '',

    user: null,

    ghostPaths: injectService(),

    userDefault: computed('ghostPaths', function () {
        return `${this.get('ghostPaths.assetRoot')}/img/user-image.png`;
    }),

    userImageBackground: computed('user.profileImage', 'userDefault', function () {
        let url = this.get('user.profileImage') || this.get('userDefault');
        let safeUrl = Handlebars.Utils.escapeExpression(url);

        return htmlSafe(`background-image: url(${safeUrl})`);
    }),

    lastLoginUTC: computed('user.lastLoginUTC', function () {
        let lastLoginUTC = this.get('user.lastLoginUTC');

        return lastLoginUTC ? moment(lastLoginUTC).fromNow() : '(Never)';
    })
});
