module.exports = function (ghostBookshelf) {
    const errors = require('@tryghost/errors');

    const RecommendationClickEvent = ghostBookshelf.Model.extend({
        tableName: 'recommendation_click_events'
    }, {
        async edit() {
            throw new errors.IncorrectUsageError({
                message: 'Cannot edit RecommendationClickEvent'
            });
        },

        async destroy() {
            throw new errors.IncorrectUsageError({
                message: 'Cannot destroy RecommendationClickEvent'
            });
        }
    });

    return {
        RecommendationClickEvent: ghostBookshelf.model('RecommendationClickEvent', RecommendationClickEvent)
    };
};

Object.assign(module.exports, module.exports(require('./base')));
