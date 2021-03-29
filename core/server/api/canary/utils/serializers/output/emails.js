const mapper = require('./utils/mapper');

module.exports = {
    read(email, apiConfig, frame) {
        frame.response = {
            emails: [mapper.mapEmail(email, frame)]
        };
    },

    browse(page, apiConfig, frame) {
        const data = {
            emails: page.data.map(model => mapper.mapEmail(model, frame)),
            meta: page.meta
        };

        frame.response = data;
    },

    get retry() {
        return this.read;
    }
};
