export const getDateString = (isoDate) => {
    if (!isoDate) {
        return '';
    }
    const event = new Date(isoDate);
    const options = {year: 'numeric', month: 'short', day: 'numeric'};
    return event.toLocaleDateString('en-GB', options);
};

const DEFAULT_DATE_LOCALE = 'en-GB';
const DEFAULT_TIMEZONE = 'Etc/UTC';
const DATE_FORMAT = {year: 'numeric', month: 'short', day: 'numeric'};

const dateFormatterFor = (locale, timeZone) => {
    try {
        return new Intl.DateTimeFormat(locale, {...DATE_FORMAT, timeZone});
    } catch (err) {
        return null;
    }
};

export const getSiteDateString = (isoDate, {locale, timezone} = {}) => {
    if (!isoDate) {
        return '';
    }

    // A publication's locale is stored unvalidated, so a tag Intl rejects
    // ("en_US") would otherwise throw a RangeError mid-render. Drop the
    // publication's settings one at a time rather than take the page down.
    const timeZone = timezone || DEFAULT_TIMEZONE;
    const formatter = dateFormatterFor(locale || DEFAULT_DATE_LOCALE, timeZone)
        || dateFormatterFor(DEFAULT_DATE_LOCALE, timeZone)
        || new Intl.DateTimeFormat(DEFAULT_DATE_LOCALE, {...DATE_FORMAT, timeZone: DEFAULT_TIMEZONE});

    const date = new Date(isoDate);
    if (Number.isNaN(date.getTime())) {
        return '';
    }

    return formatter.format(date);
};
