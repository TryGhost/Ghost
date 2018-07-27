const _ = require('lodash'),
    Promise = require('bluebird'),
    common = require('../../../../lib/common'),
    models = require('../../../../models'),
    converters = require('../../../../lib/mobiledoc/converters'),
    message1 = 'Updating posts: apply new editor format and set comment_id field.',
    message2 = 'Updated posts: apply new editor format and set comment_id field.',
    message3 = 'Rollback: Updating posts: use old editor format',
    message4 = 'Rollback: Updated posts: use old editor format';

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

                // CASE: convert all old editor posts to the new editor format
                if (mobiledoc && post.get('html') && post.get('html').match(/^<div class="kg-card-markdown">/)) {
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

module.exports.down = (options) => {
    const postAllColumns = ['id', 'html', 'mobiledoc'];

    let localOptions = _.merge({
        context: {internal: true}
    }, options);

    common.logging.info(message3);

    return models.Post.findAll(_.merge({columns: postAllColumns}, localOptions))
        .then(function (posts) {
            return Promise.map(posts.models, function (post) {
                let mobiledoc = JSON.parse(post.get('mobiledoc') || null);
                let html;

                // CASE: convert all old editor posts to the new editor format
                if (mobiledoc && post.get('html')) {
                    html = converters.mobiledocConverter.render(mobiledoc, 1);
                }

                return models.Post.edit({
                    html: html || post.get('html')
                }, _.merge({id: post.id}, localOptions));
            }, {concurrency: 100});
        })
        .then(() => {
            common.logging.info(message4);
        });
};
