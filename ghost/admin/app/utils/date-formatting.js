import moment from 'moment';

const displayDateFormat = 'DD MMM YY @ HH:mm';

// Add missing timestamps
function verifyTimeStamp(dateString) {
    if (dateString && !dateString.slice(-5).match(/\d+:\d\d/)) {
        dateString += ' 12:00';
    }
    return dateString;
}

// Formats a Date or Moment
function formatDate(value, timezone) {
    // we output the date adjusted to the blog timezone selected in settings
    return verifyTimeStamp(value ? moment(value).tz(timezone).format(displayDateFormat) : '');
}

export {
    formatDate
};
