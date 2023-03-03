const mime = require('mime-types');
const request = require('@tryghost/request');
const errors = require('@tryghost/errors');
const logging = require('@tryghost/logging');

class ExternalMediaInliner {
    /** @type {object} */
    #PostModel;

    /**
     *
     * @param {Object} deps
     * @param {Object} deps.PostModel - Post model
     * @param {(extension) => import('ghost-storage-base')} deps.getMediaStorage - getMediaStorage
     */
    constructor(deps) {
        this.#PostModel = deps.PostModel;
        this.getMediaStorage = deps.getMediaStorage;
    }

    /**
     *
     * @param {string} requestURL - url of remote media
     * @returns {Promise<Object>}
     */
    async #getRemoteMedia(requestURL) {
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

    async #inlinePost(mobiledoc, domains) {
        for (const domain of domains) {
            const regex = new RegExp(`"src":"(${domain}.*?)"`, 'igm');
            const matches = mobiledoc.matchAll(regex);

            for (const [,src] of matches) {
                const response = await this.#getRemoteMedia(src);

                let media;
                if (response) {
                    media = this.#extractFileDataFromResponse(src, response);
                }

                if (media) {
                    const storage = this.getMediaStorage(media.extension);

                    if (!storage) {
                        logging.warn(`No storage adapter found for file extension: ${media.extension}`);
                    } else {
                        const targetDir = storage.getTargetDir(storage.storagePath);
                        const uniqueFileName = await storage.getUniqueFileName({
                            name: media.filename
                        }, targetDir);
                        const filePath = await storage.saveRaw(media.fileBuffer, uniqueFileName);
                        const inlinedSrc = `__GHOST_URL__${filePath}`;

                        // NOTE: does not account for duplicate images in mobiledoc
                        //       in those cases would be processed twice
                        mobiledoc = mobiledoc.replace(src, inlinedSrc);
                        logging.info('Inlined media: ', src, ' -> ', inlinedSrc);
                    }
                }
            }
        }

        return mobiledoc;
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

        logging.info('Starting inlining external media for posts: ', posts?.length);
        for (const post of posts) {
            try {
                const inlinedMobiledoc = await this.#inlinePost(post.get('mobiledoc'), domains);

                if (inlinedMobiledoc !== post.get('mobiledoc')) {
                    await this.#PostModel.edit({
                        mobiledoc: inlinedMobiledoc
                    }, {
                        id: post.id
                    });
                }
            } catch (err) {
                logging.error(`Error inlining media for post: ${post.id}`);
                logging.error(new errors.DataImportError({
                    err
                }));
            }
        }

        logging.info('Finished inlining external media');
    }
}

module.exports = ExternalMediaInliner;
