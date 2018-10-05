const url = require('url');

module.exports = {
    API: {
        getApiQuery(route) {
            return url.resolve('/ghost/api/v0.1/', route);
        }
    }
};
