const {createDropColumnMigration} = require('../../utils');

module.exports = createDropColumnMigration('posts', 'author_id', {});

module.exports.down = async () => {
    // noop - major version migrations are not backwards compatible
};
