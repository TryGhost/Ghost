module.exports = {
    // The poll endpoint is called by the Ghost(Pro) Scheduler, which requires a
    // valid JSON object response. Pass the controller's plain object through as-is
    // (rather than letting the default serializer wrap it under an `automations` key)
    // so the body is `{polled: true}`.
    poll(data, apiConfig, frame) {
        frame.response = data;
    }
};
