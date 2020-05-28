const _ = require('lodash');
const Promise = require('bluebird');
const logging = require('../../../../../shared/logging');
const mobiledocLib = require('../../../../lib/mobiledoc');
const message1 = 'Updating posts: apply new editor format and set comment_id field.';
const message2 = 'Updated posts: apply new editor format and set comment_id field.';
const message3 = 'Rollback: Updating posts: use old editor format';
const message4 = 'Rollback: Updated posts: use old editor format';

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

    logging.info(message1);

    // @NOTE: raw knex query, because of https://github.com/TryGhost/Ghost/issues/9983
    return localOptions
        .transacting('posts')
        .select(postAllColumns)
        .then((posts) => {
            return Promise.map(posts, function (post) {
                let mobiledoc;
                let html;

                try {
                    mobiledoc = JSON.parse(post.mobiledoc || null);

                    if (!mobiledoc) {
                        mobiledoc = mobiledocLib.blankDocument;
                    }
                } catch (err) {
                    logging.warn(`Invalid mobiledoc structure for ${post.id}. Falling back to blank structure.`);
                    mobiledoc = mobiledocLib.blankDocument;
                }

                // CASE: convert all old editor posts to the new editor format
                // CASE: if mobiledoc field is null, we auto set a blank structure in the model layer
                // CASE: if html field is null, we auto generate the html in the model layer
                if (mobiledoc && post.html && post.html.match(/^<div class="kg-card-markdown">/)) {
                    html = mobiledocLib.mobiledocHtmlRenderer.render(mobiledoc);
                }
                return localOptions
                    .transacting('posts')
                    .where('id', '=', post.id)
                    .update({
                        comment_id: post.comment_id || post.id,
                        html: html || post.html,
                        mobiledoc: JSON.stringify(mobiledoc)
                    });
            }, {concurrency: 100});
        }).then(() => {
            logging.info(message2);
        });
};

module.exports.down = (options) => {
    const postAllColumns = ['id', 'html', 'mobiledoc'];

    let localOptions = _.merge({
        context: {internal: true},
        migrating: true
    }, options);

    logging.info(message3);
    return localOptions
        .transacting('posts')
        .select(postAllColumns)
        .then((posts) => {
            return Promise.map(posts, function (post) {
                let version = 1;
                let html;
                let mobiledoc = JSON.parse(post.mobiledoc || null);

                if (!mobiledocIsCompatibleWithV1(mobiledoc)) {
                    version = 2;
                }

                // CASE: revert: all new editor posts to the old editor format
                if (mobiledoc && post.html) {
                    html = mobiledocLib.mobiledocHtmlRenderer.render(mobiledoc, {version});
                }

                return localOptions
                    .transacting('posts')
                    .where('id', '=', post.id)
                    .update({
                        html: html || post.html
                    });
            }, {concurrency: 100});
        })
        .then(() => {
            logging.info(message4);
        });
};
