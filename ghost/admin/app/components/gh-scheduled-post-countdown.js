import Component from '@ember/component';
import moment from 'moment';
import {computed} from '@ember/object';
import {inject as service} from '@ember/service';

export default Component.extend({
    clock: service(),

    post: null,

    // countdown timer to show the time left until publish time for a scheduled post
    // starts 15 minutes before scheduled time
    countdown: computed('post.{publishedAtUTC,isScheduled}', 'clock.second', function () {
        let isScheduled = this.get('post.isScheduled');
        let publishTime = this.get('post.publishedAtUTC') || moment.utc();
        let timeUntilPublished = publishTime.diff(moment.utc(), 'minutes', true);
        let isPublishedSoon = timeUntilPublished > 0 && timeUntilPublished < 15;

        // force a recompute
        this.get('clock.second');

        if (isScheduled && isPublishedSoon) {
            return moment(publishTime).fromNow();
        } else {
            return false;
        }
    })
});
