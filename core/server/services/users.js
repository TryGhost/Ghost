const path = require('path');
const dbBackup = require('../data/db/backup');
const models = require('../models');

async function destroyUser(frameOptions) {
    const backupPath = await dbBackup.backup();
    const parsedFileName = path.parse(backupPath);
    const filename = `${parsedFileName.name}${parsedFileName.ext}`;

    return models.Base.transaction((t) => {
        frameOptions.transacting = t;

        return models.Post.destroyByAuthor(frameOptions)
            .then(() => {
                return models.ApiKey.destroy({
                    ...frameOptions,
                    require: true,
                    destroyBy: {
                        user_id: frameOptions.id
                    }
                }).catch((err) => {
                    if (err instanceof models.ApiKey.NotFoundError) {
                        return; //Do nothing here as it's ok
                    }
                    throw err;
                });
            })
            .then(() => {
                return models.User.destroy(Object.assign({status: 'all'}, frameOptions));
            })
            .then(() => filename);
    });
}

module.exports = {
    destroyUser
};
