export const getDateString = (isoDate) => {
    if (!isoDate) {
        return '';
    }
    const event = new Date(isoDate);
    const options = {year: 'numeric', month: 'short', day: 'numeric'};
    return event.toLocaleDateString('en-GB', options);
};
