module.exports = {
    all(model, apiConfig, frame) {
        frame.response = {
            preview: [model.toJSON(frame.options)]
        };
    }
};
