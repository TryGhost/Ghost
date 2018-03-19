import Component from '@ember/component';
import Ember from 'ember';
import moment from 'moment';
import {computed} from '@ember/object';
import {htmlSafe} from '@ember/string';
import {inject as service} from '@ember/service';

const {Handlebars} = Ember;

export default Component.extend({
    ghostPaths: service(),

    tagName: '',

    user: null,

    userDefault: computed('ghostPaths', function () {
        let image = '/img/user-image.png';
        return `${this.get('ghostPaths.assetRoot')}${image}`;
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
