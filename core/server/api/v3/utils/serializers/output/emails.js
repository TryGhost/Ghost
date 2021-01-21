const mapper = require('./utils/mapper');

module.exports = {
    read(email, apiConfig, frame) {
        frame.response = {
            emails: [mapper.mapEmail(email, frame)]
        };
    },

    get retry() {
        return this.read;
    }
};
