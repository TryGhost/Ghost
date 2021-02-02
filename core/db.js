const config = require('./shared/config');
const logging = require('./shared/logging');

module.exports.ready = async () => {
    const DatabaseStateManager = require('./server/data/db/state-manager');
    const dbStateManager = new DatabaseStateManager({knexMigratorFilePath: config.get('paths:appRoot')});
    await dbStateManager.makeReady({logging});
};
