let uniqueId = 0;

const getUniqueName = (prefix = 'id') => {
    uniqueId += 1;
    // uniqueId is incremented to avoid conflicts when running tests in parallel,
    // while Date.now() is used to avoid conflicts when running tests locally in
    // the same session (e.g. using the Playwright UI)
    return `${prefix} ${Date.now()}${uniqueId}`;
};

const getSlug = str => str.toLowerCase().split(' ').join('-');

module.exports = {
    getUniqueName,
    getSlug
};
