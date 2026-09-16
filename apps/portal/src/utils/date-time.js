export const getDateString = (isoDate) => {
  if (!isoDate) {
    return '';
  }
  const event = new Date(isoDate);
  const options = { year: 'numeric', month: 'short', day: 'numeric' };
  return event.toLocaleDateString('en-GB', options);
};

const DEFAULT_DATE_LOCALE = 'en-GB';
const DEFAULT_TIMEZONE = 'Etc/UTC';
const DATE_FORMAT = { year: 'numeric', month: 'short', day: 'numeric' };

const dateFormatterFor = (locale, timeZone) => {
  try {
    return new Intl.DateTimeFormat(locale, { ...DATE_FORMAT, timeZone });
  } catch (err) {
    return null;
  }
};

// "2026-08-03" as a local date. `new Date(string)` would read it as UTC and
// land on the previous day for anyone west of Greenwich.
export const parseDateValue = (value) => {
  const [year, month, day] = (value || '').split('-').map(Number);
  if (!year || !month || !day) {
    return null;
  }
  return new Date(year, month - 1, day);
};

export const toDateValue = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Calendar-day arithmetic on a `YYYY-MM-DD` value. Runs through UTC so the
// result never depends on the viewer's DST transitions.
export const addCalendarDays = (value, days) => {
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + days));
  return date.toISOString().slice(0, 10);
};

// Cached by timezone: construction is the expensive part. The browser's ICU
// may reject a server-validated zone, so fall back to UTC rather than throw
// mid-render.
const dateInputFormatters = new Map();

const dateInputFormatterFor = (timeZone) => {
  let formatter = dateInputFormatters.get(timeZone);
  if (!formatter) {
    const options = { year: 'numeric', month: '2-digit', day: '2-digit' };
    try {
      formatter = new Intl.DateTimeFormat('en-CA', { ...options, timeZone });
    } catch (err) {
      formatter = new Intl.DateTimeFormat('en-CA', { ...options, timeZone: DEFAULT_TIMEZONE });
    }
    dateInputFormatters.set(timeZone, formatter);
  }
  return formatter;
};

export const getDateInputValue = (date, timeZone = DEFAULT_TIMEZONE) => {
  const parts = dateInputFormatterFor(timeZone).formatToParts(date);
  const part = (type) => parts.find((item) => item.type === type)?.value;
  return `${part('year')}-${part('month')}-${part('day')}`;
};

export const getSiteDateString = (isoDate, { locale, timezone } = {}) => {
  if (!isoDate) {
    return '';
  }

  // A publication's locale is stored unvalidated, so a tag Intl rejects
  // ("en_US") would otherwise throw a RangeError mid-render. Drop the
  // publication's settings one at a time rather than take the page down.
  const timeZone = timezone || DEFAULT_TIMEZONE;
  const formatter =
    dateFormatterFor(locale || DEFAULT_DATE_LOCALE, timeZone) ||
    dateFormatterFor(DEFAULT_DATE_LOCALE, timeZone) ||
    new Intl.DateTimeFormat(DEFAULT_DATE_LOCALE, { ...DATE_FORMAT, timeZone: DEFAULT_TIMEZONE });

  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return formatter.format(date);
};
