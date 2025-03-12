const mime = require('mime-types');
const FileType = require('file-type');
const request = require('@tryghost/request');
const errors = require('@tryghost/errors');
const logging = require('@tryghost/logging');
const string = require('@tryghost/string');
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
    async getRemoteMedia(requestURL) {
        // @NOTE: this is the most expensive operation in the whole inlining process
        //        we should consider caching the results to improve performance

        // Enforce http - http > https redirects are commonplace
        requestURL = requestURL.replace(/^\/\//g, 'http://');

        // Encode to handle special characters in URLs
        requestURL = encodeURI(requestURL);
        try {
            const response = await request(requestURL, {
                followRedirect: true,
                responseType: 'buffer'
            });

            return response;
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
    async extractFileDataFromResponse(requestURL, response) {
        let extension;

        // Attempt to get the file extension from the file itself
        // If that fails, or if `.ext` is undefined, get the extension from the file path in the catch
        try {
            const fileInfo = await FileType.fromBuffer(response.body);
            extension = fileInfo.ext;
        } catch {
            const headers = response.headers;
            const contentType = headers['content-type'];
            const extensionFromPath = path.parse(requestURL).ext.split(/[^a-z]/i).filter(Boolean)[0];
            extension = mime.extension(contentType) || extensionFromPath;
        }

        const removeExtRegExp = new RegExp(`.${extension}`, '');
        const fileNameNoExt = path.parse(requestURL).base.replace(removeExtRegExp, '');

        // CASE: Query strings _can_ form part of the unique image URL, so rather that strip them include the in the file name
        // Then trim to last 248 chars (this will be more unique than the first 248), and trim leading & trailing dashes.
        // 248 is on the lower end of limits from various OSes and file systems
        const fileName = string.slugify(path.parse(fileNameNoExt).base, {
            requiredChangesOnly: true
        }).slice(-248).replace(/^-|-$/, '');

        return {
            fileBuffer: response.body,
            filename: `${fileName}.${extension}`,
            extension: `.${extension}`
        };
    }

    /**
     *
     * @param {Object} media - media to store locally
     * @returns {Promise<string>} - path to stored media
     */
    async storeMediaLocally(media) {
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

    static findMatches(content, domain) {
        // NOTE: the src could end with a quote, bracket, apostrophe, double-backslash, or encoded quote.
        //     Backlashes are added to content as an escape character
        const srcTerminationSymbols = `("|\\)|'|(?=(?:,https?))| |<|\\\\|&quot;|$)`;
        const regex = new RegExp(`(${domain}.*?)(${srcTerminationSymbols})`, 'igm');
        const matches = content.matchAll(regex);

        // Simplify the matches so we only get the result needed
        let matchesArray = Array.from(matches, m => m[1]);

        // Trim trailing commas from each match
        matchesArray = matchesArray.map((item) => {
            return item.replace(/,$/, '');
        });

        return matchesArray;
    }

    /**
     * Find & inline external media from a JSON sting.
     * This works with both Lexical & Mobiledoc, so no separate methods are needed here.
     *
     * @param {string} content - stringified JSON of post Lexical or Mobiledoc content
     * @param {String[]} domains - domains to inline media from
     * @returns {Promise<string>} - updated stringified JSON of post content
     */
    async inlineContent(content, domains) {
        for (const domain of domains) {
            const matches = this.constructor.findMatches(content, domain);

            for (const src of matches) {
                const response = await this.getRemoteMedia(src);

                let media;
                if (response) {
                    media = await this.extractFileDataFromResponse(src, response);
                }

                if (media) {
                    const filePath = await this.storeMediaLocally(media);

                    if (filePath) {
                        const inlinedSrc = `__GHOST_URL__${filePath}`;

                        // NOTE: does not account for duplicate images in content
                        //       in those cases would be processed twice
                        content = content.replace(src, inlinedSrc);
                        logging.info(`Inlined media: ${src} -> ${inlinedSrc}`);
                    }
                }
            }
        }

        return content;
    }

    /**
     *
     * @param {Object} resourceModel - one of PostModel, TagModel, UserModel instances
     * @param {String[]} fields - fields to inline
     * @param {String[]} domains - domains to inline media from
     * @returns Promise<Object> - updated fields map with local media paths
     */
    async inlineFields(resourceModel, fields, domains) {
        const updatedFields = {};

        for (const field of fields) {
            for (const domain of domains) {
                const src = resourceModel.get(field);

                if (src && src.startsWith(domain)) {
                    const response = await this.getRemoteMedia(src);

                    let media;
                    if (response) {
                        media = await this.extractFileDataFromResponse(src, response);
                    }

                    if (media) {
                        const filePath = await this.storeMediaLocally(media);

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
    async inlineSimpleFields(resources, model, fields, domains) {
        logging.info(`Starting inlining external media for ${resources?.length} resources and with ${fields.join(', ')} fields`);

        for (const resource of resources) {
            try {
                const updatedFields = await this.inlineFields(resource, fields, domains);

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
        const posts = await this.#PostModel.findAll({context: {internal: true}});
        const postsInilingFields = [
            'feature_image'
        ];

        logging.info(`Starting inlining external media for posts: ${posts?.length}`);

        for (const post of posts) {
            try {
                const mobiledocContent = post.get('mobiledoc');
                const lexicalContent = post.get('lexical');

                const updatedFields = await this.inlineFields(post, postsInilingFields, domains);

                if (mobiledocContent) {
                    const inlinedContent = await this.inlineContent(mobiledocContent, domains);

                    // If content has changed, update the post
                    if (inlinedContent !== mobiledocContent) {
                        updatedFields.mobiledoc = inlinedContent;
                    }
                }

                if (lexicalContent) {
                    const inlinedContent = await this.inlineContent(lexicalContent, domains);

                    // If content has changed, update the post
                    if (inlinedContent !== lexicalContent) {
                        updatedFields.lexical = inlinedContent;
                    }
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

        await this.inlineSimpleFields(postsMetas, this.#PostMetaModel, postsMetaInilingFields, domains);

        const {data: tags} = await this.#TagModel.findPage({
            limit: 'all'
        });
        const tagInliningFields = [
            'feature_image',
            'og_image',
            'twitter_image'
        ];

        await this.inlineSimpleFields(tags, this.#TagModel, tagInliningFields, domains);

        const {data: users} = await this.#UserModel.findPage({
            limit: 'all'
        });
        const userInliningFields = [
            'profile_image',
            'cover_image'
        ];

        await this.inlineSimpleFields(users, this.#UserModel, userInliningFields, domains);

        logging.info('Finished inlining external media for posts, tags, and users');
    }
}

module.exports = ExternalMediaInliner;
