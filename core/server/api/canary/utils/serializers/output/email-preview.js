module.exports = {
    read(emailPreview, apiConfig, frame) {
        frame.response = {
            email_previews: [emailPreview]
        };
    },
    sendTestEmail(data, apiConfig, frame) {
        frame.response = data;
    }
};
