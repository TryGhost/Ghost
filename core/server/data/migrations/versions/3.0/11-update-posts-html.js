const _ = require('lodash');
const Promise = require('bluebird');
const common = require('../../../../lib/common');
const models = require('../../../../models');
const converters = require('../../../../lib/mobiledoc/converters');

module.exports.config = {
    transaction: true
};

module.exports.up = (options) => {
    const postAllColumns = ['id', 'html', 'mobiledoc'];

    let localOptions = _.merge({
        context: {internal: true},
        migrating: true
    }, options);

    common.logging.info('Starting re-generation of posts html.');

    return models.Post.findAll(_.merge({columns: postAllColumns}, localOptions))
        .then(function (posts) {
            return Promise.map(posts.models, function (post) {
                let mobiledoc;

                try {
                    mobiledoc = JSON.parse(post.get('mobiledoc') || null);

                    if (!mobiledoc) {
                        common.logging.warn(`No mobiledoc for ${post.id}. Skipping.`);
                        return Promise.resolve();
                    }
                } catch (err) {
                    common.logging.warn(`Invalid JSON structure for ${post.id}. Skipping.`);
                    return Promise.resolve();
                }

                const html = converters.mobiledocConverter.render(mobiledoc);

                return models.Post.edit({html}, _.merge({id: post.id}, localOptions));
            }, {concurrency: 100});
        })
        .then(() => {
            common.logging.info('Finished re-generation of posts html.');
        });
};

// There's nothing we can do on rollback, getting back to the previous html
// would only be possible if the rollback was run against the 2.x codebase
module.exports.down = () => {
    return Promise.resolve();
};
