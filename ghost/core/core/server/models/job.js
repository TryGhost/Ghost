module.exports = function (ghostBookshelf) {
    const Job = ghostBookshelf.Model.extend({
        tableName: 'jobs'
    });

    return {
        Job: ghostBookshelf.model('Job', Job)
    };
};

Object.assign(module.exports, module.exports(require('./base')));
