import moment from 'moment-timezone';

export function getDateColumnValue(date, filter) {
    if (!date) {
        return null;
    }
    return {
        class: '',
        text: date ? moment.tz(date, filter.timezone).format('DD MMM YYYY') : '',
        subtext: moment(date).from(moment()),
        subtextClass: 'gh-members-list-subscribed-moment'
    };
}
