const _ = require('lodash');
const common = require('../../../../lib/common');
const converters = require('../../../../lib/mobiledoc/converters');
const models = require('../../../../models');

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

module.exports.up = function regenerateKoenigBetaHTML(options) {
    let postAllColumns = ['id', 'html', 'mobiledoc'];

    let localOptions = _.merge({
        context: {internal: true}
    }, options);

    common.logging.info('Migrating Koenig beta post\'s HTML to 2.0 format');

    return models.Post.findAll(_.merge({columns: postAllColumns}, localOptions))
        .then(function (posts) {
            return Promise.map(posts.models, function (post) {
                let mobiledoc = JSON.parse(post.get('mobiledoc') || null);

                if (
                    post.get('html').match(/^<div class="kg-post">/)
                    || !mobiledocIsCompatibleWithV1(mobiledoc)
                ) {
                    let version = 2;
                    let html = converters.mobiledocConverter.render(mobiledoc, version);

                    return models.Post.edit({
                        html
                    }, _.merge({id: post.id}, localOptions));
                }
            }, {concurrency: 100});
        });
};
