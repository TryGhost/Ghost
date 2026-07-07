module.exports = function (ghostBookshelf) {
    const Recommendation = ghostBookshelf.Model.extend({
        tableName: 'recommendations',
        defaults: {}
    }, {});

    return {
        Recommendation: ghostBookshelf.model('Recommendation', Recommendation)
    };
};

Object.assign(module.exports, module.exports(require('./base')));
