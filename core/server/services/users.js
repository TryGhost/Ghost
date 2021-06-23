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
 * @prop {(Object) => Promise} User.findAll
 * @prop {Object} Session
 * @prop {(Object) => Promise} Session.findAll
 */

/**
 * @typedef {Object} IAuth
 * @prop {Object} setup
 * @prop {(isComplete: boolean) => () => Promise} setup.assertSetupCompleted
 * @prop {Object} passwordreset
 * @prop {(email: string, apiSettings: Object, transcation?: Object) => Promise<string>} passwordreset.generateToken
 * @prop {(token: string, apiMail: Object) => Promise} passwordreset.sendResetNotification
 */

class Users {
    /**
     * @param {Object} dependencies
     * @param {IdbBackup} dependencies.dbBackup
     * @param {IModels} dependencies.models
     * @param {IAuth} dependencies.auth
     * @param {Object} dependencies.apiMail
     * @param {Object} dependencies.apiSettings
     */
    constructor({dbBackup, models, auth, apiMail, apiSettings}) {
        this.dbBackup = dbBackup;
        this.models = models;
        this.auth = auth;
        this.apiMail = apiMail;
        this.apiSettings = apiSettings;
    }

    async resetAllPasswords(frameOptions) {
        return this.models.Base.transaction(async (t) => {
            frameOptions.transacting = t;

            // Reset all passwords
            const users = await this.models.User.findAll(frameOptions);
            for (const user of users) {
                await user.save({
                    status: 'locked' // Prevent signins before password reset
                }, frameOptions);
            }

            //Send all password resets
            for (const user of users) {
                const token = await this.auth.passwordreset.generateToken(user.get('email'), this.apiSettings, t);
                await this.auth.passwordreset.sendResetNotification(token, this.apiMail);
            }
        });
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
