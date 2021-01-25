import Component from '@ember/component';
import moment from 'moment';
import {computed} from '@ember/object';
import {equal, or} from '@ember/object/computed';
import {formatNumber} from 'ghost-admin/helpers/format-number';
import {inject as service} from '@ember/service';

export default Component.extend({
    clock: service(),
    session: service(),
    feature: service(),
    settings: service(),
    config: service(),

    post: null,
    saveType: null,
    isClosing: null,

    // used to set minDate in datepicker
    _minDate: null,

    'data-test-publishmenu-scheduled': true,

    disableEmailOption: equal('memberCount', 0),
    showSendEmail: or('session.user.isOwner', 'session.user.isAdmin', 'session.user.isEditor'),

    disableFreeMemberCheckbox: computed('freeMemberCount', function () {
        return (this.get('session.user.isOwnerOrAdmin') && this.freeMemberCount === 0);
    }),

    disablePaidMemberCheckbox: computed('paidMemberCount', function () {
        return (this.get('session.user.isOwnerOrAdmin') && this.paidMemberCount === 0);
    }),

    freeMemberCountLabel: computed('freeMemberCount', function () {
        if (this.get('freeMemberCount') !== undefined) {
            return `(${formatNumber(this.get('freeMemberCount'))})`;
        }
        return '';
    }),

    paidMemberCountLabel: computed('freeMemberCount', function () {
        if (this.get('freeMemberCount') !== undefined) {
            return `(${formatNumber(this.get('paidMemberCount'))})`;
        }
        return '';
    }),

    canSendEmail: computed('feature.labs.members', 'post.{isPost,email}', 'settings.{mailgunApiKey,mailgunDomain,mailgunBaseUrl}', 'config.mailgunIsConfigured', function () {
        let membersEnabled = this.feature.get('labs.members');
        let mailgunIsConfigured = this.get('settings.mailgunApiKey') && this.get('settings.mailgunDomain') && this.get('settings.mailgunBaseUrl') || this.get('config.mailgunIsConfigured');
        let isPost = this.post.isPost;
        let hasSentEmail = !!this.post.email;

        return membersEnabled && mailgunIsConfigured && isPost && !hasSentEmail;
    }),

    sendEmailToFreeMembersWhenPublished: computed('post.emailRecipientFilter', function () {
        return ['free', 'all'].includes(this.post.emailRecipientFilter);
    }),

    sendEmailToPaidMembersWhenPublished: computed('post.emailRecipientFilter', function () {
        return ['paid', 'all'].includes(this.post.emailRecipientFilter);
    }),

    timeToPublished: computed('post.publishedAtUTC', 'clock.second', function () {
        let publishedAtUTC = this.get('post.publishedAtUTC');

        if (!publishedAtUTC) {
            return null;
        }

        this.get('clock.second');

        return publishedAtUTC.toNow(true);
    }),

    didInsertElement() {
        this.set('_minDate', new Date());
        this.setSaveType('schedule');
    },

    actions: {
        setSaveType(type) {
            if (this.saveType !== type) {
                this.set('_minDate', new Date());
                this.setSaveType(type);

                // when draft switch to now to avoid validation errors
                // when schedule switch back to saved date to avoid unnecessary re-scheduling
                if (type === 'draft') {
                    this.post.set('publishedAtBlogTZ', new Date());
                } else {
                    this.post.set('publishedAtBlogTZ', this.get('post.publishedAtUTC'));
                }

                this.post.validate();
            }
        },

        setDate(date) {
            let post = this.post;
            let dateString = moment(date).format('YYYY-MM-DD');

            post.set('publishedAtBlogDate', dateString);
            return post.validate();
        },

        setTime(time) {
            let post = this.post;

            if (!this.isClosing) {
                post.set('publishedAtBlogTime', time);
                return post.validate();
            }
        }
    }
});
