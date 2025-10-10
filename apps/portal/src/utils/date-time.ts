export const getDateString = (isoDate: string | null | undefined): string => {
    if (!isoDate) {
        return '';
    }
    const event = new Date(isoDate);
    const options: Intl.DateTimeFormatOptions = {year: 'numeric', month: 'short', day: 'numeric'};
    return event.toLocaleDateString('en-GB', options);
};
