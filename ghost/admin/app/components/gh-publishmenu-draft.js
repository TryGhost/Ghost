import Component from '@ember/component';
import moment from 'moment';
import {computed} from '@ember/object';
import {formatNumber} from 'ghost-admin/helpers/format-number';
import {isEmpty} from '@ember/utils';
import {or} from '@ember/object/computed';
import {inject as service} from '@ember/service';

export default Component.extend({
    feature: service(),
    settings: service(),
    config: service(),
    session: service(),
    post: null,
    saveType: null,

    // used to set minDate in datepicker
    _minDate: null,
    _publishedAtBlogTZ: null,

    'data-test-publishmenu-draft': true,
    showSendEmail: or('session.user.isOwner', 'session.user.isAdmin', 'session.user.isEditor'),

    disableEmailOption: computed('memberCount', function () {
        return (this.get('session.user.isOwnerOrAdmin') && this.memberCount === 0);
    }),

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

    sendEmailToFreeMembersWhenPublished: computed('sendEmailWhenPublished', function () {
        return ['free', 'all'].includes(this.sendEmailWhenPublished);
    }),

    sendEmailToPaidMembersWhenPublished: computed('sendEmailWhenPublished', function () {
        return ['paid', 'all'].includes(this.sendEmailWhenPublished);
    }),

    didInsertElement() {
        this.post.set('publishedAtBlogTZ', this.get('post.publishedAtUTC'));
        this.send('setSaveType', 'publish');
    },

    actions: {
        setSaveType(type) {
            if (this.saveType !== type) {
                let hasDateError = !isEmpty(this.get('post.errors').errorsFor('publishedAtBlogDate'));
                let hasTimeError = !isEmpty(this.get('post.errors').errorsFor('publishedAtBlogTime'));
                let minDate = this._getMinDate();

                this.set('_minDate', minDate);
                this.setSaveType(type);

                // when publish: switch to now to avoid validation errors
                // when schedule: switch to last valid or new minimum scheduled date
                if (type === 'publish') {
                    if (!hasDateError && !hasTimeError) {
                        this._publishedAtBlogTZ = this.get('post.publishedAtBlogTZ');
                    } else {
                        this._publishedAtBlogTZ = this.get('post.publishedAtUTC');
                    }

                    this.post.set('publishedAtBlogTZ', this.get('post.publishedAtUTC'));
                } else {
                    if (!this._publishedAtBlogTZ || moment(this._publishedAtBlogTZ).isBefore(minDate)) {
                        this.post.set('publishedAtBlogTZ', minDate);
                    } else {
                        this.post.set('publishedAtBlogTZ', this._publishedAtBlogTZ);
                    }
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

            post.set('publishedAtBlogTime', time);
            return post.validate();
        },

        toggleSendEmailWhenPublished(type) {
            let isFree = this.get('sendEmailToFreeMembersWhenPublished');
            let isPaid = this.get('sendEmailToPaidMembersWhenPublished');
            if (type === 'free') {
                isFree = !isFree;
            } else if (type === 'paid') {
                isPaid = !isPaid;
            }
            if (isFree && isPaid) {
                this.setSendEmailWhenPublished('all');
            } else if (isFree && !isPaid) {
                this.setSendEmailWhenPublished('free');
            } else if (!isFree && isPaid) {
                this.setSendEmailWhenPublished('paid');
            } else if (!isFree && !isPaid) {
                this.setSendEmailWhenPublished('none');
            }
        }
    },

    // scheduled date 5 mins in the future to avoid immediate validation errors
    _getMinDate() {
        return moment.utc().add(5, 'minutes');
    }
    // API only accepts dates at least 2 mins in the future, default the
});
