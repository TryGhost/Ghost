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
    classNames: ['gh-list-row', 'gh-tags-list-item'],

    active: false,

    id: alias('member.id'),
    email: alias('member.email'),
    name: computed('member.name', function () {
        return this.member.name || '-';
    }),
    subscribedAt: computed('member.createdAt', function () {
        return moment(this.member.createdAt).format('YYYY-MM-DD HH:mm');
    })
});
