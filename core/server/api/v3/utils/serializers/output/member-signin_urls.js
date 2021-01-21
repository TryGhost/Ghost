module.exports = {
    read(data, apiConfig, frame) {
        frame.response = {
            member_signin_urls: [data]
        };
    }
};
