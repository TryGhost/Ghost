// @ts-check
const path = require('path');

/**
 * @typedef {Object} IdbBackup
 * @prop {() => Promise<string>} backup
 */

/**
 * @typedef {Object} IModels
 * @prop {Object} Base
 * @prop {(callback: function) => Promise} Base.transaction
 * @prop {Object} Post
 * @prop {(frameOptions: Object) => Promise} Post.destroyByAuthor
 * @prop {Object} ApiKey
 * @prop {(Object) => Promise} ApiKey.destroy
 * @prop {Object} ApiKey.NotFoundError
 * @prop {Object} User
 * @prop {(Object) => Promise} User.destroy
 */

class Users {
    /**
     * @param {Object} dependencies
     * @param {IdbBackup} dependencies.dbBackup
     * @param {IModels} dependencies.models
     */
    constructor({dbBackup, models}) {
        this.dbBackup = dbBackup;
        this.models = models;
    }

    async destroyUser(frameOptions) {
        const backupPath = await this.dbBackup.backup();
        const parsedFileName = path.parse(backupPath);
        const filename = `${parsedFileName.name}${parsedFileName.ext}`;

        return this.models.Base.transaction((t) => {
            frameOptions.transacting = t;

            return this.models.Post.destroyByAuthor(frameOptions)
                .then(() => {
                    return this.models.ApiKey.destroy({
                        ...frameOptions,
                        require: true,
                        destroyBy: {
                            user_id: frameOptions.id
                        }
                    }).catch((err) => {
                        if (err instanceof this.models.ApiKey.NotFoundError) {
                            return; //Do nothing here as it's ok
                        }
                        throw err;
                    });
                })
                .then(() => {
                    return this.models.User.destroy(Object.assign({status: 'all'}, frameOptions));
                })
                .then(() => filename);
        });
    }
}

module.exports = Users;
