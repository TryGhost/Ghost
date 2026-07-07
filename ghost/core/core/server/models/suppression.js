module.exports = function (ghostBookshelf) {
    const Suppression = ghostBookshelf.Model.extend({
        tableName: 'suppressions'
    });

    return {
        Suppression: ghostBookshelf.model('Suppression', Suppression)
    };
};

Object.assign(module.exports, module.exports(require('./base')));
