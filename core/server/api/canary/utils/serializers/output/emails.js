module.exports = {
    read(email, apiConfig, frame) {
        frame.response = {
            emails: [email]
        };
    },

    get retry() {
        return this.read;
    }
};
