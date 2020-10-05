const mapper = require('./utils/mapper');

module.exports = {
    all(model, apiConfig, frame) {
        frame.response = {
            preview: [mapper.mapPost(model, frame)]
        };
    }
};
