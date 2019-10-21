import Component from '@ember/component';
import moment from 'moment';
import {alias} from '@ember/object/computed';
import {computed} from '@ember/object';
import {inject as service} from '@ember/service';

export default Component.extend({
    ghostPaths: service(),
    notifications: service(),
    router: service(),

    tagName: 'li',
    classNames: ['gh-list-row', 'gh-members-list-item'],

    active: false,

    id: alias('member.id'),
    email: alias('member.email'),
    name: alias('member.name'),
    memberSince: computed('member.createdAt', function () {
        return moment(this.member.createdAt).from(moment());
    }),
    createdDate: computed('member.createdAt', function () {
        return moment(this.member.createdAt).format('MMM DD, YYYY');
    })
});
