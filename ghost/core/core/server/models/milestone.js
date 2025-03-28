const ghostBookshelf = require('./base');

const Milestone = ghostBookshelf.Model.extend({
    tableName: 'milestones'
});

module.exports = {
    Milestone: ghostBookshelf.model('Milestone', Milestone)
};
