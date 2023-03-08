const mime = require('mime-types');
const request = require('@tryghost/request');
const errors = require('@tryghost/errors');
const logging = require('@tryghost/logging');
const path = require('path');

class ExternalMediaInliner {
    /** @type {object} */
    #PostModel;

    /** @type {object} */
    #PostMetaModel;

    /** @type {object} */
    #TagModel;

    /** @type {object} */
    #UserModel;

    /**
     *
     * @param {Object} deps
     * @param {Object} deps.PostModel - Post model
     * @param {Object} deps.PostMetaModel - PostMeta model
     * @param {Object} deps.TagModel - Tag model
     * @param {Object} deps.UserModel - User model
     * @param {(extension) => import('ghost-storage-base')} deps.getMediaStorage - getMediaStorage
     */
    constructor(deps) {
        this.#PostModel = deps.PostModel;
        this.#PostMetaModel = deps.PostMetaModel;
        this.#TagModel = deps.TagModel;
        this.#UserModel = deps.UserModel;
        this.getMediaStorage = deps.getMediaStorage;
    }

    /**
     *
     * @param {string} requestURL - url of remote media
     * @returns {Promise<Object>}
     */
    async #getRemoteMedia(requestURL) {
        // @NOTE: this is the most expensive operation in the whole inlining process
        //        we should consider caching the results to improve performance
        try {
            return await request(requestURL, {
                followRedirect: true,
                encoding: null
            });
        } catch (error) {
            // NOTE: add special case for 404s
            logging.error(`Error downloading remote media: ${requestURL}`);
            logging.error(new errors.DataImportError({
                err: error
            }));

            return null;
        }
    }

    /**
     *
     * @param {Object} response - response from request
     * @returns {Object}
     */
    #extractFileDataFromResponse(requestURL, response) {
        const headers = response.headers;
        const contentType = headers['content-type'];

        const filename = requestURL
            .split('/')
            .pop()
            .split('#')[0]
            .split('?')[0];

        const extension = mime.extension(contentType) || filename.split('.').pop();

        return {
            fileBuffer: response.body,
            filename: filename,
            extension: `.${extension}`
        };
    }

    /**
     *
     * @param {Object} media - media to store locally
     * @returns {Promise<string>} - path to stored media
     */
    async #storeMediaLocally(media) {
        const storage = this.getMediaStorage(media.extension);

        if (!storage) {
            logging.warn(`No storage adapter found for file extension: ${media.extension}`);
            return null;
        } else {
            // @NOTE: this is extremely convoluted and should live on a
            //        storage adapter level
            const targetDir = storage.getTargetDir(storage.storagePath);
            const uniqueFileName = await storage.getUniqueFileName({
                name: media.filename
            }, targetDir);
            const targetPath = path.relative(storage.storagePath, uniqueFileName);
            const filePath = await storage.saveRaw(media.fileBuffer, targetPath);
            return filePath;
        }
    }

    async #inlineMibiledoc(mobiledoc, domains) {
        for (const domain of domains) {
            // NOTE: the src could end with a quote, apostrophe or double-backslash. backlashes are added to mobiledoc
            //       as an escape character
            const srcTerminationSymbols = `"|'|\\\\`;
            const regex = new RegExp(`(${domain}.*?)(${srcTerminationSymbols})`, 'igm');
            const matches = mobiledoc.matchAll(regex);

            for (const [,src] of matches) {
                const response = await this.#getRemoteMedia(src);

                let media;
                if (response) {
                    media = this.#extractFileDataFromResponse(src, response);
                }

                if (media) {
                    const filePath = await this.#storeMediaLocally(media);

                    if (filePath) {
                        const inlinedSrc = `__GHOST_URL__${filePath}`;

                        // NOTE: does not account for duplicate images in mobiledoc
                        //       in those cases would be processed twice
                        mobiledoc = mobiledoc.replace(src, inlinedSrc);
                        logging.info(`Inlined media: ${src} -> ${inlinedSrc}`);
                    }
                }
            }
        }

        return mobiledoc;
    }

    /**
     *
     * @param {Object} resourceModel - one of PostModel, TagModel, UserModel instances
     * @param {String[]} fields - fields to inline
     * @param {String[]} domains - domains to inline media from
     * @returns Promise<Object> - updated fields map with local media paths
     */
    async #inlineFields(resourceModel, fields, domains) {
        const updatedFields = {};

        for (const field of fields) {
            for (const domain of domains) {
                const src = resourceModel.get(field);

                if (src && src.startsWith(domain)) {
                    const response = await this.#getRemoteMedia(src);

                    let media;
                    if (response) {
                        media = this.#extractFileDataFromResponse(src, response);
                    }

                    if (media) {
                        const filePath = await this.#storeMediaLocally(media);

                        if (filePath) {
                            const inlinedSrc = `__GHOST_URL__${filePath}`;

                            updatedFields[field] = inlinedSrc;
                            logging.info(`Added media to inline: ${src} -> ${inlinedSrc}`);
                        }
                    }
                }
            }
        }

        return updatedFields;
    }

    /**
     *
     * @param {Object[]} resources - array of model instances
     * @param {Object} model - resource model
     * @param {string[]} fields - fields to inline
     * @param {string[]} domains - domains to inline media from
     */
    async #inlineSimpleFields(resources, model, fields, domains) {
        logging.info(`Starting inlining external media for ${resources?.length} resources and with ${fields.join(', ')} fields`);

        for (const resource of resources) {
            try {
                const updatedFields = await this.#inlineFields(resource, fields, domains);

                if (Object.keys(updatedFields).length > 0) {
                    await model.edit(updatedFields, {
                        id: resource.id,
                        context: {
                            internal: true
                        }
                    });
                }
            } catch (err) {
                logging.error(`Error inlining media for: ${resource.id}`);
                logging.error(new errors.DataImportError({
                    err
                }));
            }
        }
    }

    /**
     *
     * @param {string[]} domains domains to inline media from
     */
    async inline(domains) {
        const {data: posts} = await this.#PostModel.findPage({
            limit: 'all',
            status: 'all'
        });
        const postsInilingFields = [
            'feature_image'
        ];

        logging.info(`Starting inlining external media for posts: ${posts?.length}`);

        for (const post of posts) {
            try {
                const inlinedMobiledoc = await this.#inlineMibiledoc(post.get('mobiledoc'), domains);
                const updatedFields = await this.#inlineFields(post, postsInilingFields, domains);

                if (inlinedMobiledoc !== post.get('mobiledoc')) {
                    updatedFields.mobiledoc = inlinedMobiledoc;
                }

                if (Object.keys(updatedFields).length > 0) {
                    await this.#PostModel.edit(updatedFields, {
                        id: post.id,
                        context: {
                            internal: true
                        }
                    });
                }
            } catch (err) {
                logging.error(`Error inlining media for post: ${post.id}`);
                logging.error(new errors.DataImportError({
                    err
                }));
            }
        }

        const {data: postsMetas} = await this.#PostMetaModel.findPage({
            limit: 'all'
        });
        const postsMetaInilingFields = [
            'og_image',
            'twitter_image'
        ];

        await this.#inlineSimpleFields(postsMetas, this.#PostMetaModel, postsMetaInilingFields, domains);

        const {data: tags} = await this.#TagModel.findPage({
            limit: 'all'
        });
        const tagInliningFields = [
            'feature_image',
            'og_image',
            'twitter_image'
        ];

        await this.#inlineSimpleFields(tags, this.#TagModel, tagInliningFields, domains);

        const {data: users} = await this.#UserModel.findPage({
            limit: 'all'
        });
        const userInliningFields = [
            'profile_image',
            'cover_image'
        ];

        await this.#inlineSimpleFields(users, this.#UserModel, userInliningFields, domains);

        logging.info('Finished inlining external media for posts, tags, and users');
    }
}

module.exports = ExternalMediaInliner;
