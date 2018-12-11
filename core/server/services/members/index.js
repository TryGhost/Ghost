const labs = require('../labs');
module.exports = {
    get api() {
        if (!labs.isSet('members')) {
            return {};
        }
        return require('./api');
    }
};
