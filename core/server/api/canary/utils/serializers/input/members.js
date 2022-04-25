const _ = require('lodash');
const debug = require('@tryghost/debug')('api:canary:utils:serializers:input:members');
const mapNQLKeyValues = require('@tryghost/nql').utils.mapKeyValues;
const labsService = require('../../../../../../shared/labs');
const models = require('../../../../../models');

function defaultRelations(frame) {
    if (frame.options.withRelated) {
        return;
    }

    if (frame.options.columns && !frame.options.withRelated) {
        return false;
    }

    frame.options.withRelated = ['labels'];
}

async function mapSubscribedFlagToNewsletters(frame) {
    // CASE: ignore `subscribed` if `newsletters` is also set
    if (Object.prototype.hasOwnProperty.call(frame.data.members[0], 'newsletters')) {
        debug('both subscribed and newsletters present - ignoring subscribed');
        return;
    }

    if (frame.data.members[0].subscribed) {
        // CASE: ensure the member has at least one subscription
        debug('subscribed=true');
        if (frame.options.id) {
            const existingMember = await models.Member.findOne(
                {id: frame.options.id},
                {withRelated: ['newsletters']}
            );
            if (existingMember && existingMember.related('newsletters').length > 0) {
                debug('subscribed=true and we have newsletters already - nothing to do');
                return;
            }
        }

        // subscribed=true but we don't have any newsletters
        debug('subscribing to the default newsletter');
        const defaultNewsletter = await models.Newsletter.getDefaultNewsletter(frame.options);
        frame.data.members[0].newsletters = [{id: defaultNewsletter.id}];
    } else {
        // CASE: unsubscribe from all emails
        // subscribed=false -> newsletters=[]
        debug('unsubscribing from newsletters');
        frame.data.members[0].newsletters = [];
    }
}

module.exports = {
    browse(apiConfig, frame) {
        debug('browse');
        defaultRelations(frame);

        if (labsService.isSet('multipleNewsletters')) {
            frame.options.mongoTransformer = mapNQLKeyValues({
                key: {
                    from: 'subscribed',
                    to: 'newsletters.status'
                },
                values: [{
                    from: true,
                    to: 'active'
                }, {
                    from: false,
                    to: {$ne: 'active'}
                }]
            });
        }
    },

    read() {
        debug('read');

        this.browse(...arguments);
    },

    async add(apiConfig, frame) {
        debug('add');
        if (frame.data.members[0].labels) {
            frame.data.members[0].labels.forEach((label, index) => {
                if (_.isString(label)) {
                    frame.data.members[0].labels[index] = {
                        name: label
                    };
                }
            });
        }
        await mapSubscribedFlagToNewsletters(frame);
        defaultRelations(frame);
    },

    async edit(apiConfig, frame) {
        debug('edit');
        await this.add(apiConfig, frame);
    },

    async importCSV(apiConfig, frame) {
        debug('importCSV');
        if (!frame.data.labels) {
            frame.data.labels = [];
            return;
        }
        if (typeof frame.data.labels === 'string') {
            frame.data.labels = [{name: frame.data.labels}];
            return;
        }
        if (Array.isArray(frame.data.labels)) {
            frame.data.labels = frame.data.labels.map(name => ({name}));
            return;
        }
    }
};
