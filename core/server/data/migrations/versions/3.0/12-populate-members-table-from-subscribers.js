const ObjectId = require('bson-objectid');
const _ = require('lodash');
const membersSchema = require('../../../schema').tables.members;
const models = require('../../../../models');
const common = require('../../../../lib/common');

module.exports.config = {
    transaction: true
};

module.exports.up = (options) => {
    const localOptions = _.merge({
        context: {internal: true},
        migrating: true
    }, options);

    const memberAttrs = _.keys(membersSchema);

    return models.Subscribers
        .forge()
        .fetch(localOptions)
        .then(({models: subscribers}) => {
            if (subscribers.length > 0) {
                common.logging.info(`Adding ${subscribers.length} entries to subscribers`);

                let members = _.map(subscribers, (subscriber) => {
                    let member = memberAttrs.reduce(function (obj, entry) {
                        return Object.assign(obj, {
                            [entry]: subscriber.get(entry)
                        });
                    }, {});
                    member.id = ObjectId.generate();

                    return member;
                });
                return localOptions.transacting('members').insert(members);
            } else {
                common.logging.info('Skipping populating members table: found 0 subscribers');
                return Promise.resolve();
            }
        });
};

module.exports.down = () => {
    return Promise.reject();
};
