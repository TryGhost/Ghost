module.exports = {
    read(data, apiConfig, frame) {
        frame.response = {
            identities: [data]
        };
    }
};
