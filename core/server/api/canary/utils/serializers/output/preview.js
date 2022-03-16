const mappers = require('./mappers');
const membersService = require('../../../../../services/members');

module.exports = {
    async all(model, apiConfig, frame) {
        const tiersModels = await membersService.api.productRepository.list({
            withRelated: ['monthlyPrice', 'yearlyPrice']
        });
        const tiers = tiersModels.data ? tiersModels.data.map(tierModel => tierModel.toJSON()) : [];

        const data = await mappers.posts(model, frame, {tiers});
        frame.response = {
            preview: [data]
        };
        frame.response.preview[0].page = model.get('type') === 'page';
    }
};
