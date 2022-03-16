const mappers = require('./mappers');

module.exports = {
    read(email, apiConfig, frame) {
        frame.response = {
            emails: [mappers.emails(email, frame)]
        };
    },

    browse(page, apiConfig, frame) {
        const data = {
            emails: page.data.map(model => mappers.emails(model, frame)),
            meta: page.meta
        };

        frame.response = data;
    },

    get retry() {
        return this.read;
    }
};
