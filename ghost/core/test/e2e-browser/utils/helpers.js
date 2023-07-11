let uniqueId = 0;

const getUniqueName = (prefix = 'id') => {
    uniqueId += 1;
    return `${prefix} ${uniqueId}`;
};

const getSlug = str => str.toLowerCase().split(' ').join('-');

module.exports = {
    getUniqueName,
    getSlug
};
