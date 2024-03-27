import Helper from '@ember/component/helper';
import moment from 'moment-timezone';
import {assert} from '@ember/debug';
import {inject as service} from '@ember/service';

export function formatPostTime(timeago, {timezone = 'etc/UTC', format, relative, absolute, scheduled, short}) {
    if (relative) {
        // No special handling, just use moment.from
        return moment(timeago).from(moment.utc());
    }

    let time = moment.tz(timeago, timezone);

    if (format) {
        return time.format(format);
    }

    let now = moment.tz(moment.utc(), timezone);

    let utcOffset;
    if (time.utcOffset() === 0) {
        utcOffset = '(UTC)';
    } else {
        utcOffset = `(UTC${time.format('Z').replace(/([+-])0/, '$1').replace(/:00/, '')})`;
    }

    // If draft was edited <= 12 hours ago
    // or post was published <= 12 hours ago
    // or scheduled to be published <= 12 hours from now, use moment.from
    if (Math.abs(now.diff(time, 'hours')) <= 12) {
        return time.from(now);
    }

    // If scheduled for or published on the same day, render the time + Today
    if (time.isSame(now, 'day')) {
        let formatted = time.format(`HH:mm [${utcOffset}] [Today]`);
        return scheduled ? `at ${formatted}` : formatted;
    }

    // if draft was edited yesterday, render time + yesterday
    // if post was published yesterday, render time + yesterday
    // if short format, just render Yesterday (without time)
    // This check comes before scheduled, because there are likely to be more published
    // posts than scheduled posts.
    if (absolute && time.isSame(now.clone().subtract(1, 'days').startOf('day'), 'day')) {
        if (short) {
            return time.format(`[Yesterday]`);
        }
        return time.format(`HH:mm [${utcOffset}] [yesterday]`);
    }

    // if scheduled for tomorrow, render the time + tomorrow
    if (scheduled && time.isSame(now.clone().add(1, 'days').startOf('day'), 'day')) {
        return time.format(`[at] HH:mm [${utcOffset}] [tomorrow]`);
    }

    // Else, render just the date if edited or published, or the time & date if scheduled
    let f = scheduled ? `[at] HH:mm [${utcOffset}] [on] DD MMM YYYY` : (short ? `DD MMM YYYY` : `HH:mm [${utcOffset}] DD MMM YYYY`);
    return time.format(f);
}

export default class GhFormatPostTimeHelper extends Helper {
    @service settings;

    compute([timeago], options) {
        assert('You must pass a time to the gh-format-post-time helper', timeago);

        return formatPostTime(timeago, Object.assign({}, options, {timezone: this.settings.timezone}));
    }
}
