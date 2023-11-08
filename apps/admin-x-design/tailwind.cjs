// eslint-disable-next-line @typescript-eslint/no-var-requires
const config = require('./tailwind.config');

module.exports = selector => ({
    ...config,
    important: selector
});
