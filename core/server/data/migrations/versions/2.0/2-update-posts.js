const _ = require('lodash'),
    Promise = require('bluebird'),
    common = require('../../../../lib/common'),
    models = require('../../../../models'),
    converters = require('../../../../lib/mobiledoc/converters'),
    message1 = 'Updating post data (comment_id)',
    message2 = 'Updated post data (comment_id)',
    message3 = 'Rollback: Changes for amp/comment_id were rolled back automatically.';

module.exports.config = {
    transaction: true
};

module.exports.up = (options) => {
    const postAllColumns = ['id', 'comment_id', 'html', 'mobiledoc'];

    let localOptions = _.merge({
        context: {internal: true}
    }, options);

    common.logging.info(message1);

    return models.Post.findAll(_.merge({columns: postAllColumns}, localOptions))
        .then(function (posts) {
            return Promise.map(posts.models, function (post) {
                let mobiledoc = JSON.parse(post.get('mobiledoc') || null);
                let html;

                // @TODO: throw error if mobiledoc is incompatible? what if mobiledoc is null and html is empty? what if mobiledoc is null, but html is set?
                if (post.get('html').match(/^<div class="kg-card-markdown">/)) {
                    html = converters.mobiledocConverter.render(mobiledoc);
                }

                return models.Post.edit({
                    comment_id: post.get('comment_id') || post.id,
                    html: html || post.get('html')
                }, _.merge({id: post.id}, localOptions));
            }, {concurrency: 100});
        })
        .then(() => {
            common.logging.info(message2);
        });
};

// @NOTE: all posts are getting updated in a transaction. MySQL will auto-rollback the changes from above.
module.exports.down = () => {
    common.logging.warn(message3);
    return Promise.resolve();
};
