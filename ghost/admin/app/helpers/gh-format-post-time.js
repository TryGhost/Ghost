import Helper from '@ember/component/helper';
import moment from 'moment';
import {assert} from '@ember/debug';
import {inject as service} from '@ember/service';

export default Helper.extend({
    settings: service(),

    compute([timeago], {draft, scheduled, published}) {
        assert('You must pass a time to the gh-format-post-time helper', timeago);

        if (draft) {
            // No special handling for drafts, just use moment.from
            return moment(timeago).from(moment.utc());
        }

        let timezone = this.get('settings.timezone');
        let time = moment.tz(timeago, timezone);
        let now = moment.tz(moment.utc(), timezone);

        // If not a draft and post was published <= 15 minutes ago
        // or scheduled to be published <= 15 minutes from now, use moment.from
        if (Math.abs(now.diff(time, 'minutes')) <= 15) {
            return time.from(now);
        }

        // If scheduled for or published on the same day, render the time + Today
        if (time.isSame(now, 'day')) {
            let formatted = time.format('HH:mm [Today]');
            return scheduled ? `at ${formatted}` : formatted;
        }

        // if published yesterday, render time + yesterday
        // This check comes before scheduled, because there are likely to be more published
        // posts than scheduled posts.
        if (published && time.isSame(now.clone().subtract(1, 'days').startOf('day'), 'day')) {
            return time.format('HH:mm [Yesterday]');
        }

        // if scheduled for tomorrow, render the time + Tomorrow
        if (scheduled && time.isSame(now.clone().add(1, 'days').startOf('day'), 'day')) {
            return time.format('[at] HH:mm [Tomorrow]');
        }

        // Else, render just the date if published, or the time & date if scheduled
        let format = scheduled ? '[at] HH:mm [on] DD MMM YYYY' : 'DD MMM YYYY';
        return time.format(format);
    }
});
