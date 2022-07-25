const ghostBookshelf = require('./base');

const Job = ghostBookshelf.Model.extend({
    tableName: 'jobs'
});

module.exports = {
    Job: ghostBookshelf.model('Job', Job)
};
