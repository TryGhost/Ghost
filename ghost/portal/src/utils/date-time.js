export const getDateString = (isoDate) => {
    const date = new Date(isoDate);
    const month = date.toDateString().substring(4, 7);
    const day = date.toDateString().substring(8, 10).replace(/^0+/g, '');
    const year = date.toDateString().substring(11, 15);
    return `${day} ${month} ${year}`;
};