const Promise = require('bluebird');

module.exports.config = {
    transaction: true
};

// no-op'd because migration has been fixed and will be available in 3.12.0
module.exports.up = () => Promise.resolve();

// `up` is only run to fix a problem that is introduced with 3.10.0,
// it doesn't make sense to "reintroduced" broken state with down migration
module.exports.down = () => Promise.resolve();

module.exports.config = {
    transaction: true
};
