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

let mobiledocIsCompatibleWithV1 = function mobiledocIsCompatibleWithV1(doc) {
    if (doc
        && doc.markups.length === 0
        && doc.cards.length === 1
        && doc.cards[0][0].match(/(?:card-)?markdown/)
        && doc.sections.length === 1
        && doc.sections[0].length === 2
        && doc.sections[0][0] === 10
        && doc.sections[0][1] === 0
    ) {
        return true;
    }

    return false;
};

module.exports.up = (options) => {
    const postAllColumns = ['id', 'comment_id', 'html', 'mobiledoc'];

    let localOptions = _.merge({
        context: {internal: true},
        migrating: true
    }, options);

    common.logging.info(message1);

    return models.Post.findAll(_.merge({columns: postAllColumns}, localOptions))
        .then(function (posts) {
            return Promise.map(posts.models, function (post) {
                let mobiledoc;
                let html;

                try {
                    mobiledoc = JSON.parse(post.get('mobiledoc') || null);

                    if (!mobiledoc) {
                        mobiledoc = converters.mobiledocConverter.blankStructure();
                    }
                } catch (err) {
                    common.logging.warn(`Invalid mobiledoc structure for ${post.id}. Falling back to blank structure.`);
                    mobiledoc = converters.mobiledocConverter.blankStructure();
                }

                // CASE: convert all old editor posts to the new editor format
                // CASE: if mobiledoc field is null, we auto set a blank structure in the model layer
                // CASE: if html field is null, we auto generate the html in the model layer
                if (mobiledoc && post.get('html') && post.get('html').match(/^<div class="kg-card-markdown">/)) {
                    html = converters.mobiledocConverter.render(mobiledoc);
                }

                return models.Post.edit({
                    comment_id: post.get('comment_id') || post.id,
                    html: html || post.get('html'),
                    mobiledoc: JSON.stringify(mobiledoc)
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
        context: {internal: true},
        migrating: true
    }, options);

    common.logging.info(message3);

    return models.Post.findAll(_.merge({columns: postAllColumns}, localOptions))
        .then(function (posts) {
            return Promise.map(posts.models, function (post) {
                let version = 1;
                let html;
                let mobiledoc = JSON.parse(post.get('mobiledoc') || null);

                if (!mobiledocIsCompatibleWithV1(mobiledoc)) {
                    version = 2;
                }

                // CASE: revert: all new editor posts to the old editor format
                if (mobiledoc && post.get('html')) {
                    html = converters.mobiledocConverter.render(mobiledoc, version);
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
