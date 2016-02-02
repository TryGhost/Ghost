/* global moment */
// jscs: disable disallowSpacesInsideParentheses

const parseDateFormats = ['DD MMM YY @ HH:mm', 'DD MMM YY HH:mm',
                          'D MMM YY @ HH:mm', 'D MMM YY HH:mm',
                          'DD MMM YYYY @ HH:mm', 'DD MMM YYYY HH:mm',
                          'D MMM YYYY @ HH:mm', 'D MMM YYYY HH:mm',
                          'DD/MM/YY @ HH:mm', 'DD/MM/YY HH:mm',
                          'DD/MM/YYYY @ HH:mm', 'DD/MM/YYYY HH:mm',
                          'DD-MM-YY @ HH:mm', 'DD-MM-YY HH:mm',
                          'DD-MM-YYYY @ HH:mm', 'DD-MM-YYYY HH:mm',
                          'YYYY-MM-DD @ HH:mm', 'YYYY-MM-DD HH:mm',
                          'DD MMM @ HH:mm', 'DD MMM HH:mm',
                          'D MMM @ HH:mm', 'D MMM HH:mm'];

const displayDateFormat = 'DD MMM YY @ HH:mm';

// Add missing timestamps
function verifyTimeStamp(dateString) {
    if (dateString && !dateString.slice(-5).match(/\d+:\d\d/)) {
        dateString += ' 12:00';
    }
    return dateString;
}

// Parses a string to a Moment
function parseDateString(value, offset) {
    // We need the offset here, otherwise the date will be parsed
    // in UTC timezone
    moment.tz.setDefault(offset);

    return value ? moment(verifyTimeStamp(value), parseDateFormats, true) : undefined;
}

// Formats a Date or Moment
function formatDate(value, offset) {
    // we output the date adjusted by the offset of the timezone set in the blog setting
    return verifyTimeStamp(value ? moment(value).tz(offset).format(displayDateFormat) : '');
}

export {
    parseDateString,
    formatDate
};
