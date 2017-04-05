import Ember from 'ember';
import Component from 'ember-component';
import computed from 'ember-computed';
import injectService from 'ember-service/inject';
import {htmlSafe} from 'ember-string';
import moment from 'moment';

// ember-cli-shims doesn't export these
const {Handlebars} = Ember;

export default Component.extend({
    tagName: '',

    user: null,

    ghostPaths: injectService(),

    userDefault: computed('ghostPaths', function () {
        return `${this.get('ghostPaths.assetRoot')}/img/user-image.png`;
    }),

    userImageBackground: computed('user.image', 'userDefault', function () {
        let url = this.get('user.image') || this.get('userDefault');
        let safeUrl = Handlebars.Utils.escapeExpression(url);

        return htmlSafe(`background-image: url(${safeUrl})`);
    }),

    lastLoginUTC: computed('user.lastLoginUTC', function () {
        let lastLoginUTC = this.get('user.lastLoginUTC');

        return lastLoginUTC ? moment(lastLoginUTC).fromNow() : '(Never)';
    })
});
