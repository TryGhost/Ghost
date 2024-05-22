const errors = require('@tryghost/errors');
const ghostBookshelf = require('./base');

const RecommendationSubscribeEvent = ghostBookshelf.Model.extend({
    tableName: 'recommendation_subscribe_events'
}, {
    async edit() {
        throw new errors.IncorrectUsageError({
            message: 'Cannot edit RecommendationSubscribeEvent'
        });
    },

    async destroy() {
        throw new errors.IncorrectUsageError({
            message: 'Cannot destroy RecommendationSubscribeEvent'
        });
    }
});

module.exports = {
    RecommendationSubscribeEvent: ghostBookshelf.model('RecommendationSubscribeEvent', RecommendationSubscribeEvent)
};
