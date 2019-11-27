module.exports = {
    read(email, apiConfig, frame) {
        frame.response = {
            emails: [email.toJSON(frame.options)]
        };
    },

    get retry() {
        return this.read;
    }
};
