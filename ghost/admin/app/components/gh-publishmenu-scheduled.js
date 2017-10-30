import Component from '@ember/component';
import moment from 'moment';
import {computed} from '@ember/object';
import {inject as service} from '@ember/service';

export default Component.extend({
    clock: service(),

    post: null,
    saveType: null,
    isClosing: null,

    // used to set minDate in datepicker
    _minDate: null,

    'data-test-publishmenu-scheduled': true,

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
        this.get('setSaveType')('schedule');
    },

    actions: {
        setSaveType(type) {
            if (this.get('saveType') !== type) {
                this.set('_minDate', new Date());
                this.get('setSaveType')(type);

                // when draft switch to now to avoid validation errors
                // when schedule switch back to saved date to avoid unnecessary re-scheduling
                if (type === 'draft') {
                    this.get('post').set('publishedAtBlogTZ', new Date());
                } else {
                    this.get('post').set('publishedAtBlogTZ', this.get('post.publishedAtUTC'));
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

            if (!this.get('isClosing')) {
                post.set('publishedAtBlogTime', time);
                return post.validate();
            }
        }
    }
});
