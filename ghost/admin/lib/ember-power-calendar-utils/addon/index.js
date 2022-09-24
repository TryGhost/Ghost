import moment from 'moment-timezone';

export function add(date, quantity, unit) {
    return moment(date)
        .add(quantity, unit)
        .toDate();
}

export function formatDate(date, format, locale = null) {
    if (locale) {
        return withLocale(locale, () => moment(date).format(format));
    } else {
        return moment(date).format(format);
    }
}

export function startOf(date, unit) {
    return moment(date)
        .startOf(unit)
        .toDate();
}

export function endOf(date, unit) {
    return moment(date)
        .endOf(unit)
        .toDate();
}

export function weekday(date) {
    return moment(date).weekday();
}

export function isoWeekday(date) {
    return moment(date).isoWeekday();
}

export function getWeekdaysShort() {
    return moment.weekdaysShort();
}

export function getWeekdaysMin() {
    return moment.weekdaysMin();
}

export function getWeekdays() {
    return moment.weekdays();
}

export function isAfter(date1, date2) {
    return moment(date1).isAfter(date2);
}

export function isBefore(date1, date2) {
    return moment(date1).isBefore(date2);
}

export function isSame(date1, date2, unit) {
    return moment(date1).isSame(date2, unit);
}

export function isBetween(date, start, end, unit, inclusivity) {
    return moment(date).isBetween(start, end, unit, inclusivity);
}

export function diff(date1, date2) {
    return moment(date1).diff(date2);
}

export function normalizeDate(dateOrMoment) {
    if (
        dateOrMoment === undefined ||
    dateOrMoment === null ||
    dateOrMoment === '' ||
    dateOrMoment instanceof Date
    ) {
        return dateOrMoment;
    } else {
        return dateOrMoment.toDate();
    }
}

export function normalizeRangeActionValue(val) {
    return {
        date: val.date,
        moment: {
            start: val.date.start ? moment(val.date.start) : val.date.start,
            end: val.date.end ? moment(val.date.end) : val.date.end
        }
    };
}

export function normalizeMultipleActionValue(val) {
    return {
        date: val.date,
        moment: val.date ? val.date.map(e => moment(e)) : val.date
    };
}

export function normalizeCalendarDay(day) {
    day.moment = moment(day.date);
    return day;
}

export function withLocale(locale, fn) {
    let returnValue;
    if (locale) {
        let previousLocale = moment.locale();
        moment.locale(locale);
        returnValue = fn();
        moment.locale(previousLocale);
    } else {
        returnValue = fn();
    }
    return returnValue;
}

export function normalizeCalendarValue(value) {
    if (value) {
        return {date: value.date, moment: value.date ? moment(value.date) : undefined};
    }
    return {date: undefined, moment: undefined};
}

export function normalizeDuration(value) {
    if (value === null) {
        return null;
    }
    if (moment.isDuration(value)) {
        return value.asMilliseconds();
    }
    if (typeof value === 'number') {
        return value;
    }
    if (typeof value === 'string') {
        let [, quantity, units] = value.match(/(\d+)(.*)/);
        units = units.trim() || 'days';
        return moment.duration(parseInt(quantity, 10), units).asMilliseconds();
    }
}

export function getDefaultLocale() {
    return moment.locale();
}

export function localeStartOfWeek(locale) {
    let now = new Date();
    let day = withLocale(locale, () => formatDate(startOf(now, 'week'), 'dddd'));
    let idx = withLocale(locale, getWeekdays).indexOf(day);
    return idx >= 0 ? idx : 0;
}

export function startOfWeek(day, _startOfWeek) {
    while (isoWeekday(day) % 7 !== _startOfWeek) {
        day = add(day, -1, 'day');
    }
    return day;
}

export function endOfWeek(day, _startOfWeek) {
    let eow = (_startOfWeek + 6) % 7;
    while (isoWeekday(day) % 7 !== eow) {
        day = add(day, 1, 'day');
    }
    return day;
}
