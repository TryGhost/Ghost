let uniqueId = 0;

const getUniqueName = (prefix = 'id') => {
    uniqueId += 1;
    return `${prefix} ${uniqueId}`;
};

const getSlug = str => str.toLowerCase().split(' ').join('-');

const getUniqueEmail = () => {
    uniqueId += 1;
    return `test-email-${uniqueId}@test.com`;
};

module.exports = {
    getUniqueName,
    getSlug,
    getUniqueEmail
};
