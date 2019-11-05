module.exports = {
    read(emailPreview, apiConfig, frame) {
        frame.response = {
            email_previews: [emailPreview]
        };
    }
};
