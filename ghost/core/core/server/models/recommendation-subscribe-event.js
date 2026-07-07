module.exports = function (ghostBookshelf) {
    const errors = require('@tryghost/errors');

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

    return {
        RecommendationSubscribeEvent: ghostBookshelf.model('RecommendationSubscribeEvent', RecommendationSubscribeEvent)
    };
};

Object.assign(module.exports, module.exports(require('./base')));
