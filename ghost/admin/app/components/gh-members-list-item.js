import Component from '@ember/component';
import moment from 'moment';
import {alias, or} from '@ember/object/computed';
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

    displayName: or('member.name', 'member.email'),

    memberSince: computed('member.createdAtUTC', function () {
        return moment(this.member.createdAtUTC).from(moment());
    }),
    createdDate: computed('member.createdAtUTC', function () {
        return moment(this.member.createdAtUTC).format('MMM DD, YYYY');
    })
});
