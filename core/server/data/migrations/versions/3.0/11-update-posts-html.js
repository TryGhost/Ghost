const _ = require('lodash');
const Promise = require('bluebird');
const htmlToText = require('html-to-text');
const logging = require('../../../../../shared/logging');
const mobiledocLib = require('../../../../lib/mobiledoc');

module.exports.config = {
    transaction: true
};

module.exports.up = (options) => {
    const columns = ['id', 'html', 'mobiledoc', 'plaintext'];

    let localOptions = _.merge({
        context: {internal: true},
        migrating: true
    }, options);

    logging.info('Starting re-generation of posts html.');
    return localOptions
        .transacting('posts')
        .select(columns)
        .then((posts) => {
            return Promise.map(posts, function (post) {
                let mobiledoc;

                try {
                    mobiledoc = JSON.parse(post.mobiledoc || null);

                    if (!mobiledoc) {
                        logging.warn(`No mobiledoc for ${post.id}. Skipping.`);
                        return Promise.resolve();
                    }
                } catch (err) {
                    logging.warn(`Invalid JSON structure for ${post.id}. Skipping.`);
                    return Promise.resolve();
                }

                const html = mobiledocLib.mobiledocHtmlRenderer.render(mobiledoc);

                const updatedAttrs = {
                    html: html
                };

                // NOTE: block comes straight from the Post model (https://github.com/TryGhost/Ghost/blob/3.0.0/core/server/models/post.js#L416)
                if (html !== post.html || !post.plaintext) {
                    const plaintext = htmlToText.fromString(post.html, {
                        wordwrap: 80,
                        ignoreImage: true,
                        hideLinkHrefIfSameAsText: true,
                        preserveNewlines: true,
                        returnDomByDefault: true,
                        uppercaseHeadings: false
                    });

                    // CASE: html is e.g. <p></p>
                    // @NOTE: Otherwise we will always update the resource to `plaintext: ''` and Bookshelf thinks that this
                    //        value was modified.
                    if (plaintext || plaintext !== post.plaintext) {
                        updatedAttrs.plaintext = plaintext;
                    }
                }

                return localOptions
                    .transacting('posts')
                    .where('id', '=', post.id)
                    .update(updatedAttrs);
            }, {concurrency: 100});
        })
        .then(() => {
            logging.info('Finished re-generation of posts html.');
        });
};

// There's nothing we can do on rollback, getting back to the previous html
// would only be possible if the rollback was run against the 2.x codebase
module.exports.down = () => {
    return Promise.resolve();
};
