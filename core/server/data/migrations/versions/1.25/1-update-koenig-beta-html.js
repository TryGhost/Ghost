const _ = require('lodash');
const Promise = require('bluebird');
const logging = require('@tryghost/logging');
const mobiledocLib = require('../../../../lib/mobiledoc');
const models = require('../../../../models');
const message1 = 'Migrating Koenig beta post\'s mobiledoc/HTML to 2.0 format';
const message2 = 'Migrated Koenig beta post\'s mobiledoc/HTML to 2.0 format';

const mobiledocIsCompatibleWithV1 = function mobiledocIsCompatibleWithV1(doc) {
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

module.exports.config = {
    transaction: true
};

module.exports.up = function regenerateKoenigBetaHTML(options) {
    let postAllColumns = ['id', 'html', 'mobiledoc'];

    let localOptions = _.merge({
        context: {internal: true}
    }, options);

    logging.info(message1);

    return models.Post.findAll(_.merge({columns: postAllColumns}, localOptions))
        .then(function (posts) {
            return Promise.map(posts.models, function (post) {
                let mobiledoc = JSON.parse(post.get('mobiledoc') || null);

                if (
                    post.get('html') && post.get('html').match(/^<div class="kg-post">/)
                    || (mobiledoc && !mobiledocIsCompatibleWithV1(mobiledoc))
                ) {
                    // change imagecard.payload.imageStyle to imagecard.payload.cardWidth
                    mobiledoc.cards.forEach((card) => {
                        if (card[0] === 'image') {
                            card[1].cardWidth = card[1].imageStyle;
                            delete card[1].imageStyle;
                        }
                    });

                    // re-render the html to remove .kg-post wrapper and adjust image classes
                    let version = 2;
                    let html = mobiledocLib.mobiledocHtmlRenderer.render(mobiledoc, {version});

                    return models.Post.edit({
                        html,
                        mobiledoc: JSON.stringify(mobiledoc)
                    }, _.merge({id: post.id}, localOptions));
                }
            }, {concurrency: 100});
        })
        .then(() => {
            logging.info(message2);
        });
};
