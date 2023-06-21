// @ts-check
const path = require('path');

/**
 * @TODO: pass these in as dependencies
 */
const {PostRevisions} = require('@tryghost/post-revisions');

/**
 * @typedef {Object} IdbBackup
 * @prop {() => Promise<string>} backup
 */

/**
 * @typedef {Object} IModels
 * @prop {Object} Base
 * @prop {(callback: function) => Promise} Base.transaction
 * @prop {Object} Post
 * @prop {(frameOptions: Object) => Promise} Post.reassignByAuthor
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

        this.assignTagToUserPosts = this.assignTagToUserPosts.bind(this);
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

    async assignTagToUserPosts({id, context, transacting}) {
        // create an internal tag to assign to reassigned posts
        // in following format: `#{author_slug}`
        const author = await this.models.User.findOne({
            id
        }, {
            id,
            context,
            transacting
        });
        let tag = await this.models.Tag.findOne({
            slug: `hash-${author.get('slug')}`
        }, {
            context,
            transacting
        });

        if (!tag) {
            tag = await this.models.Tag.add({
                slug: `#${author.get('slug')}`
            }, {
                context,
                transacting
            });
        }

        const userPosts = await this.models.Base.knex('posts_authors')
            .transacting(transacting)
            .where('author_id', id)
            .select('post_id');
        const usersPostIds = userPosts.map(p => p.post_id);

        // Add a tag to all posts that do not have the author tag yet
        // NOTE: the method is implemented in an iterative way to avoid
        //       memory consumption in case the user has thousands of posts
        //       assigned to them. Also, didn't have any "bulk" way to add
        //       a tag to multiple posts as the "sort_order" needs custom
        //       logic to be run for each post.
        //       Rewrite this bit if/when we hit a performance bottleneck here
        for (const postId of usersPostIds) {
            const post = await this.models.Post.findOne({
                id: postId,
                status: 'all'
            }, {
                id: postId,
                withRelated: ['tags'],
                context,
                transacting
            });

            // check if tag already assigned to the post
            const existingTagSlugs = post.relations.tags.models.map(t => t.get('slug'));

            if (!existingTagSlugs.includes(tag.get('slug'))) {
                await this.models.Post.edit({
                    tags: [...post.relations.tags.models, tag]
                }, {
                    id: postId,
                    context,
                    transacting
                });
            }
        }
    }

    /**
     *
     * @param {Object} frameOptions
     * @param {string} frameOptions.id - user ID to destroy
     * @param {Object} frameOptions.context - frame context to perform the action
     * @returns
     */
    async destroyUser(frameOptions) {
        const backupPath = await this.dbBackup.backup();
        const parsedFileName = path.parse(backupPath);
        const filename = `${parsedFileName.name}${parsedFileName.ext}`;

        return this.models.Base.transaction(async (t) => {
            frameOptions.transacting = t;

            const postRevisions = new PostRevisions({
                model: this.models.PostRevision
            });

            await postRevisions.removeAuthorFromRevisions(frameOptions.id, {
                transacting: frameOptions.transacting
            });

            await this.assignTagToUserPosts({
                id: frameOptions.id,
                context: frameOptions.context,
                transacting: frameOptions.transacting
            });

            await this.models.Post.reassignByAuthor({
                id: frameOptions.id,
                context: frameOptions.context,
                transacting: frameOptions.transacting
            });

            try {
                await this.models.ApiKey.destroy({
                    ...frameOptions,
                    require: true,
                    destroyBy: {
                        user_id: frameOptions.id
                    }
                });
            } catch (err) {
                if (!(err instanceof this.models.ApiKey.NotFoundError)) {
                    throw err;
                }
            }

            await this.models.User.destroy(Object.assign({status: 'all'}, frameOptions));

            return filename;
        });
    }
}

module.exports = Users;
