module.exports = {
    read(email, apiConfig, frame) {
        frame.response = {
            emails: [email]
        };
    }
};
