const _ = require('lodash');
const common = require('../../../../lib/common');
const models = require('../../../../models');
const fixtures = require('../../../../data/schema/fixtures');
const message1 = 'Adding demo post.';
const message2 = 'Added demo post.';
const message3 = 'Skipped: Adding demo post. Slug already in use.';

module.exports.config = {
    transaction: true
};

module.exports.up = (options) => {
    let localOptions = _.merge({
        context: {internal: true},
        columns: ['id']
    }, options);

    let userId;

    common.logging.info(message1);

    const demoPost = _.cloneDeep(fixtures.models[5].entries[0]);

    return models.Post.findOne({slug: demoPost.slug, status: 'all'}, localOptions)
        .then((model) => {
            if (model) {
                common.logging.warn(message3);
                return;
            }

            return models.User.findOne({id: fixtures.models[4].entries[1].id}, localOptions)
                .then((ghostAuthor) => {
                    if (ghostAuthor) {
                        userId = ghostAuthor.id;
                        return;
                    }

                    return models.User.getOwnerUser(localOptions);
                })
                .then((ownerUser) => {
                    if (!userId) {
                        userId = ownerUser.id;
                    }

                    demoPost.created_by = userId;
                    demoPost.author_id = userId;

                    return models.Post.add(demoPost, localOptions);
                })
                .then(() => {
                    common.logging.info(message2);
                });
        });
};
