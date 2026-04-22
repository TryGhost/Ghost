// @ts-check
const path = require('path');
const ObjectId = require('bson-objectid').default;

/**
 * @TODO: pass these in as dependencies
 */
const DomainEvents = require('@tryghost/domain-events/lib/DomainEvents');

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
        // get author slug
        const author = await this.models.User.findOne({
            id
        }, {
            id,
            context,
            transacting
        });

        // get list of posts that need the tag assigned
        const userPosts = await this.models.Base.knex('posts_authors')
            .transacting(transacting)
            .where('author_id', id)
            .select('post_id');
        let usersPostIds = userPosts.map(p => p.post_id);

        if (usersPostIds.length === 0) {
            return;
        }

        // create an internal tag to assign to reassigned posts
        // in following format: `#{author_slug}`
        let createdTag = false;
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
            createdTag = true;
        }

        // filter out posts that already have the tag if we didn't need to create one
        if (!createdTag) {
            const tagId = tag.get('id');
            const taggedPostIds = await this.models.Base.knex('posts_tags')
                .transacting(transacting)
                .where('tag_id', tagId)
                .select('post_id');
            usersPostIds = userPosts
                .map(p => p.post_id)
                .filter(p => !taggedPostIds.includes(p));
        }

        // assign tag to posts
        //  do bulk insert for performance reasons
        //  - go ahead and assign sort_order 0 to all of them
        await this.models.Base.knex('posts_tags')
            .transacting(transacting)
            .insert(usersPostIds.map(postId => ({
                id: (new ObjectId()).toHexString(),
                post_id: postId,
                tag_id: tag.get('id'),
                sort_order: 0
            })));

        // manually add an entry in the Actions table that specifies the number of posts edited; see #bulkAddTags for similar logic
        await this.models.Post.addActions('edited', usersPostIds, {transacting, context});

        // dispatch event to ensure collections are updated
        const {PostsBulkAddTagsEvent} = require('../../shared/events-ts');
        DomainEvents.dispatch(PostsBulkAddTagsEvent.create(usersPostIds));
    }

    /**
     *
     * @param {Object} frameOptions
     * @param {string} frameOptions.id - user ID to destroy
     * @param {Object} frameOptions.context - frame context to perform the action
     * @returns
     */
    async destroyUser(frameOptions) {
        let filename = null;
        const backupPath = await this.dbBackup.backup();

        if (backupPath) {
            const parsedFileName = path.parse(backupPath);
            filename = `${parsedFileName.name}${parsedFileName.ext}`;
        }

        return this.models.Base.transaction(async (t) => {
            frameOptions.transacting = t;

            const {PostRevisions} = require('../lib/post-revisions');

            // null author field for users' post revisions
            const postRevisions = new PostRevisions({
                model: this.models.PostRevision
            });
            await postRevisions.removeAuthorFromRevisions(frameOptions.id, {
                transacting: frameOptions.transacting
            });

            // create a #author-slug tag and assign it to their posts
            await this.assignTagToUserPosts({
                id: frameOptions.id,
                context: frameOptions.context,
                transacting: frameOptions.transacting
            });

            // reassign posts to owner user
            await this.models.Post.reassignByAuthor({
                id: frameOptions.id,
                context: frameOptions.context,
                transacting: frameOptions.transacting
            });

            // delete user
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
