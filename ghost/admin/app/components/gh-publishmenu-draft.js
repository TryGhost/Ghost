import Component from '@ember/component';
import moment from 'moment';
import {computed} from '@ember/object';
import {isEmpty} from '@ember/utils';
import {inject as service} from '@ember/service';

const MEMBERS_SEGMENT_MAP = [{
    name: 'all',
    segment: 'status:free,status:-free'
}, {
    name: 'free',
    segment: 'status:free'
}, {
    name: 'paid',
    segment: 'status:-free'
}, {
    name: 'none',
    segment: null
}];

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

    disableEmailOption: computed('memberCount', function () {
        return (this.get('session.user.isOwnerOrAdmin') && this.memberCount === 0);
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

        setSendEmailWhenPublished(segment) {
            const segmentName = MEMBERS_SEGMENT_MAP.findBy('segment', segment).name;
            this.setSendEmailWhenPublished(segmentName);
        }
    },

    // scheduled date 5 mins in the future to avoid immediate validation errors
    _getMinDate() {
        return moment.utc().add(5, 'minutes');
    }
    // API only accepts dates at least 2 mins in the future, default the
});
