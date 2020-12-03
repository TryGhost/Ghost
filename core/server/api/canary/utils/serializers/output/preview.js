const mapper = require('./utils/mapper');

module.exports = {
    all(model, apiConfig, frame) {
        frame.response = {
            preview: [mapper.mapPost(model, frame)]
        };
        frame.response.preview[0].page = model.get('type') === 'page';
    }
};
