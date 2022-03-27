module.exports = {
    // @TODO remove for 5.0
    // This should be a default serializer, not a passthrough, as per the read endpoint
    sendTestEmail(data, apiConfig, frame) {
        frame.response = data;
    }
};
