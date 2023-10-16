const errors = require('@tryghost/errors');
const ghostBookshelf = require('./base');

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

module.exports = {
    RecommendationClickEvent: ghostBookshelf.model('RecommendationClickEvent', RecommendationClickEvent)
};
