import Component from '@ember/component';
import moment from 'moment';
import {isEmpty} from '@ember/utils';

export default Component.extend({

    post: null,
    saveType: null,

    // used to set minDate in datepicker
    _minDate: null,
    _publishedAtBlogTZ: null,

    'data-test-publishmenu-draft': true,

    didInsertElement() {
        this.get('post').set('publishedAtBlogTZ', this.get('post.publishedAtUTC'));
        this.send('setSaveType', 'publish');
    },

    actions: {
        setSaveType(type) {
            if (this.get('saveType') !== type) {
                let hasDateError = !isEmpty(this.get('post.errors').errorsFor('publishedAtBlogDate'));
                let hasTimeError = !isEmpty(this.get('post.errors').errorsFor('publishedAtBlogTime'));
                let minDate = this._getMinDate();

                this.set('_minDate', minDate);
                this.get('setSaveType')(type);

                // when publish: switch to now to avoid validation errors
                // when schedule: switch to last valid or new minimum scheduled date
                if (type === 'publish') {
                    if (!hasDateError && !hasTimeError) {
                        this._publishedAtBlogTZ = this.get('post.publishedAtBlogTZ');
                    } else {
                        this._publishedAtBlogTZ = this.get('post.publishedAtUTC');
                    }

                    this.get('post').set('publishedAtBlogTZ', this.get('post.publishedAtUTC'));
                } else {
                    if (!this._publishedAtBlogTZ || moment(this._publishedAtBlogTZ).isBefore(minDate)) {
                        this.get('post').set('publishedAtBlogTZ', minDate);
                    } else {
                        this.get('post').set('publishedAtBlogTZ', this._publishedAtBlogTZ);
                    }
                }

                this.get('post').validate();
            }
        },

        setDate(date) {
            let post = this.get('post');
            let dateString = moment(date).format('YYYY-MM-DD');

            post.set('publishedAtBlogDate', dateString);
            return post.validate();
        },

        setTime(time) {
            let post = this.get('post');

            post.set('publishedAtBlogTime', time);
            return post.validate();
        }
    },

    // API only accepts dates at least 2 mins in the future, default the
    // scheduled date 5 mins in the future to avoid immediate validation errors
    _getMinDate() {
        return moment.utc().add(5, 'minutes');
    }
});
