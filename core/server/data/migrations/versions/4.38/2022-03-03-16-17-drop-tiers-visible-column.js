const {createDropColumnMigration} = require('../../utils');

module.exports = createDropColumnMigration('products', 'visible', {});

module.exports.down = () => {
    // noop - column was replaced by `visibility` instead
};
