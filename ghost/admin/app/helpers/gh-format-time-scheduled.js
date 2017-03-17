import {helper} from 'ember-helper';

// TODO: this isn't used currently - safe to delete?

export function timeToSchedule(params) {
    if (!params || !params.length) {
        return;
    }

    let [, blogTimezone] = params;
    let [time] = params;

    if (blogTimezone.get('isFulfilled')) {
        return moment.utc(time).tz(blogTimezone.get('content')).format('DD MMM YYYY, HH:mm');
    }
}

export default helper(function (params) {
    return timeToSchedule(params);
});
