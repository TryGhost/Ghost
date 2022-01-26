const mapper = require('./utils/mapper');

module.exports = {
    async all(model, apiConfig, frame) {
        const data = await mapper.mapPost(model, frame);
        frame.response = {
            preview: [data]
        };
        frame.response.preview[0].page = model.get('type') === 'page';
    }
};
