const _ = require('lodash'),
    Promise = require('bluebird'),
    common = require('../../../../lib/common'),
    models = require('../../../../models'),
    message1 = 'Updating post data (comment_id)',
    message2 = 'Updated post data (comment_id)',
    message3 = 'Nothing todo. Keep correct comment_id values in amp column.';

module.exports.config = {
    transaction: true
};

module.exports.up = (options) => {
    const postAllColumns = ['id', 'comment_id'];

    let localOptions = _.merge({
        context: {internal: true}
    }, options);

    common.logging.info(message1);

    return models.Post.findAll(_.merge({columns: postAllColumns}, localOptions))
        .then(function (posts) {
            return Promise.map(posts.models, function (post) {
                if (post.get('comment_id')) {
                    return Promise.resolve();
                }

                return models.Post.edit({
                    comment_id: post.id
                }, _.merge({id: post.id}, localOptions));
            }, {concurrency: 100});
        })
        .then(() => {
            common.logging.info(message2);
        });
};

module.exports.down = () => {
    common.logging.info(message3);
    return Promise.resolve();
};
