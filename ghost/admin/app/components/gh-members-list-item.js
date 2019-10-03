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
    classNames: ['gh-flex-list-row'],

    active: false,

    id: alias('member.id'),
    email: alias('member.email'),
    name: alias('member.name'),
    subscribedAt: computed('member.createdAt', function () {
        let memberSince = moment(this.member.createdAt).from(moment());
        let createdDate = moment(this.member.createdAt).format('MMM DD, YYYY');
        return `${createdDate} (${memberSince})`;
    })
});
