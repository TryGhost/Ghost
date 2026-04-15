module.exports = {
    all(data, apiConfig, frame) {
        frame.response = {
            automated_email_sequences: data
        };
    }
};
