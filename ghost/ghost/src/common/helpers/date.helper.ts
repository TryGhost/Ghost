export function now(): Date {
    const date = new Date();
    date.setMilliseconds(0);
    return date;
}
