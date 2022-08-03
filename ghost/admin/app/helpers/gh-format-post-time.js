import Helper from '@ember/component/helper';
import moment from 'moment';
import {assert} from '@ember/debug';
import {inject as service} from '@ember/service';

export function formatPostTime(timeago, {timezone = 'etc/UTC', draft, scheduled, published}) {
    if (draft) {
        // No special handling for drafts, just use moment.from
        return moment(timeago).from(moment.utc());
    }

    let time = moment.tz(timeago, timezone);
    let now = moment.tz(moment.utc(), timezone);

    let utcOffset;
    if (time.utcOffset() === 0) {
        utcOffset = '(UTC)';
    } else {
        utcOffset = `(UTC${time.format('Z').replace(/([+-])0/, '$1').replace(/:00/, '')})`;
    }

    // If not a draft and post was published <= 12 hours ago
    // or scheduled to be published <= 12 hours from now, use moment.from
    if (Math.abs(now.diff(time, 'hours')) <= 12) {
        return time.from(now);
    }

    // If scheduled for or published on the same day, render the time + Today
    if (time.isSame(now, 'day')) {
        let formatted = time.format(`HH:mm [${utcOffset}] [Today]`);
        return scheduled ? `at ${formatted}` : formatted;
    }

    // if published yesterday, render time + yesterday
    // This check comes before scheduled, because there are likely to be more published
    // posts than scheduled posts.
    if (published && time.isSame(now.clone().subtract(1, 'days').startOf('day'), 'day')) {
        return time.format(`HH:mm [${utcOffset}] [Yesterday]`);
    }

    // if scheduled for tomorrow, render the time + tomorrow
    if (scheduled && time.isSame(now.clone().add(1, 'days').startOf('day'), 'day')) {
        return time.format(`[at] HH:mm [${utcOffset}] [tomorrow]`);
    }

    // Else, render just the date if published, or the time & date if scheduled
    let format = scheduled ? `[at] HH:mm [${utcOffset}] [on] DD MMM YYYY` : 'DD MMM YYYY';
    return time.format(format);
}

export default class GhFormatPostTimeHelper extends Helper {
    @service settings;

    compute([timeago], options) {
        assert('You must pass a time to the gh-format-post-time helper', timeago);

        return formatPostTime(timeago, Object.assign({}, options, {timezone: this.settings.get('timezone')}));
    }
}
