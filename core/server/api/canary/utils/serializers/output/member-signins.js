module.exports = {
    read(data, apiConfig, frame) {
        frame.response = {
            member_signins: [data]
        };
    }
};
