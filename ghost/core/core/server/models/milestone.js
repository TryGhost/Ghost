module.exports = function (ghostBookshelf) {
    const Milestone = ghostBookshelf.Model.extend({
        tableName: 'milestones'
    });

    return {
        Milestone: ghostBookshelf.model('Milestone', Milestone)
    };
};

Object.assign(module.exports, module.exports(require('./base')));
