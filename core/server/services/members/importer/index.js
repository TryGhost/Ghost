const _ = require('lodash');
const uuid = require('uuid');
const ObjectId = require('bson-objectid');
const moment = require('moment-timezone');
const errors = require('@tryghost/errors');
const membersService = require('../index');
const {i18n} = require('../../../lib/common');
const db = require('../../../data/db');
const logging = require('../../../../shared/logging');

const cleanupUndefined = (obj) => {
    for (let key in obj) {
        if (obj[key] === 'undefined') {
            delete obj[key];
        }
    }
};

function serializeMemberLabels(labels) {
    if (_.isString(labels)) {
        if (labels === '') {
            return [];
        }

        return [{
            name: labels.trim()
        }];
    } else if (labels) {
        return labels.filter((label) => {
            return !!label;
        }).map((label) => {
            if (_.isString(label)) {
                return {
                    name: label.trim()
                };
            }
            return label;
        });
    }
    return [];
}

const doImport = async ({members, allLabelModels, importSetLabels, imported, invalid, createdBy}) => {
    const mappedMemberBatchData = [];
    const mappedMembersLabelsBatchAssociations = [];
    const membersWithStripeCustomers = [];
    const membersWithComplimentaryPlans = [];

    members.forEach((member) => {
        cleanupUndefined(member);

        let subscribed;
        if (_.isUndefined(member.subscribed_to_emails)) {
            // model default
            subscribed = 'true';
        } else {
            subscribed = (String(member.subscribed_to_emails).toLowerCase() !== 'false');
        }

        member.labels = (member.labels && member.labels.split(',')) || [];
        const entryLabels = serializeMemberLabels(member.labels);
        const mergedLabels = _.unionBy(entryLabels, importSetLabels, 'name');

        let createdAt = member.created_at === '' ? undefined : member.created_at;

        if (createdAt) {
            const date = new Date(createdAt);

            // CASE: client sends `0000-00-00 00:00:00`
            if (isNaN(date)) {
                // TODO: throw in validation stage for single record, not whole batch!
                throw new errors.ValidationError({
                    message: i18n.t('errors.models.base.invalidDate', {key: 'created_at'}),
                    code: 'DATE_INVALID'
                });
            }

            createdAt = moment(createdAt).toDate();
        } else {
            createdAt = new Date();
        }

        const memberId = ObjectId.generate();
        mappedMemberBatchData.push({
            id: memberId,
            uuid: uuid.v4(), // member model default
            email: member.email,
            name: member.name,
            note: member.note,
            subscribed: subscribed,
            created_at: createdAt,
            created_by: createdBy
        });

        if (mergedLabels) {
            mergedLabels.forEach((label, index) => {
                const matchedLabel = allLabelModels.find(labelModel => labelModel.get('name') === label.name);

                mappedMembersLabelsBatchAssociations.push({
                    id: ObjectId.generate(),
                    member_id: memberId,
                    label_id: matchedLabel.id,
                    sort_order: index
                });
            });
        }

        if (member.stripe_customer_id) {
            membersWithStripeCustomers.push({
                stripe_customer_id: member.stripe_customer_id,
                id: memberId,
                email: member.email
            });
        }

        if ((String(member.complimentary_plan).toLocaleLowerCase() === 'true')) {
            membersWithComplimentaryPlans.push({
                id: memberId,
                email: member.email
            });
        }
    });

    try {
        // TODO: below inserts most likely need to be wrapped into transaction
        //       to avoid creating orphaned member_labels connections
        const CHUNK_SIZE = 5000;
        const chunkedMembers = _.chunk(mappedMemberBatchData, CHUNK_SIZE);
        for (const data of chunkedMembers) {
            await db.knex('members')
                .insert(data);
        }

        const chunkedLebelAssociations = _.chunk(mappedMembersLabelsBatchAssociations, CHUNK_SIZE);

        for (const data of chunkedLebelAssociations) {
            await db.knex('members_labels')
                .insert(data);
        }

        imported.count += mappedMemberBatchData.length;
    } catch (error) {
        logging.error(error);

        if (error.code && error.message.toLowerCase().indexOf('unique') !== -1) {
            invalid.errors.push(new errors.ValidationError({
                message: i18n.t('errors.api.members.memberAlreadyExists.message'),
                context: i18n.t('errors.api.members.memberAlreadyExists.context')
            }));
        } else {
            // NOTE: probably need to wrap this error into something more specific e.g. ImportError
            invalid.errors.push(error);
        }

        invalid.count += mappedMemberBatchData.length;
    }

    if (membersWithStripeCustomers.length || membersWithComplimentaryPlans.length) {
        const deleteMemberKnex = async (id) => {
            // TODO: cascading wont work on SQLite needs 2 separate deletes
            //       for members_labels and members wrapped into a transaction
            const deletedMembersCount = await db.knex('members')
                .where('id', id)
                .del();

            if (deletedMembersCount) {
                imported.count -= deletedMembersCount;
                invalid.count += deletedMembersCount;
            }
        };

        if (!membersService.config.isStripeConnected()) {
            const memberIdsToDestroy = _.uniq([
                ...membersWithStripeCustomers.map(m => m.id),
                ...membersWithComplimentaryPlans.map(m => m.id)
            ]);

            // TODO: cascading wont work on SQLite needs 2 separate deletes
            //       for members_labels and members wrapped into a transaction
            const deleteMembersCount = await db.knex('members')
                .whereIn('id', memberIdsToDestroy)
                .del();

            imported.count -= deleteMembersCount;
            invalid.count += deleteMembersCount;
            invalid.errors.push(new errors.ValidationError({
                message: i18n.t('errors.api.members.stripeNotConnected.message'),
                context: i18n.t('errors.api.members.stripeNotConnected.context'),
                help: i18n.t('errors.api.members.stripeNotConnected.help')
            }));
        } else {
            if (membersWithStripeCustomers.length) {
                await Promise.map(membersWithStripeCustomers, async (stripeMember) => {
                    try {
                        await membersService.api.members.linkStripeCustomerById(stripeMember.stripe_customer_id, stripeMember.id);
                    } catch (error) {
                        if (error.message.indexOf('customer') && error.code === 'resource_missing') {
                            error.message = `Member not imported. ${error.message}`;
                            error.context = i18n.t('errors.api.members.stripeCustomerNotFound.context');
                            error.help = i18n.t('errors.api.members.stripeCustomerNotFound.help');
                        }
                        logging.error(error);
                        invalid.errors.push(error);

                        await deleteMemberKnex(stripeMember.id);
                    }
                }, {
                    concurrency: 9
                });
            }

            if (membersWithComplimentaryPlans.length) {
                await Promise.map(membersWithComplimentaryPlans, async (complimentaryMember) => {
                    try {
                        await membersService.api.members.setComplimentarySubscriptionById(complimentaryMember.id);
                    } catch (error) {
                        logging.error(error);
                        invalid.errors.push(error);
                        await deleteMemberKnex(complimentaryMember.id);
                    }
                }, {
                    concurrency: 10 // TODO: check if this concurrency level doesn't fail rate limits
                });
            }
        }
    }
};

module.exports = doImport;
