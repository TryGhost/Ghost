const _ = require('lodash');
const uuid = require('uuid');
const ObjectId = require('bson-objectid');
const moment = require('moment-timezone');
const errors = require('@tryghost/errors');
const debug = require('ghost-ignition').debug('importer:members');
const membersService = require('../index');
const models = require('../../../models');
const {i18n} = require('../../../lib/common');
const logging = require('../../../../shared/logging');

const handleUnrecognizedError = (error) => {
    if (!errors.utils.isIgnitionError(error)) {
        return new errors.DataImportError({
            message: error.message,
            context: error.context,
            err: error
        });
    } else {
        return error;
    }
};

const doImport = async ({members, labels, importSetLabels, createdBy}) => {
    debug(`Importing members: ${members.length}, labels: ${labels.length}, import lables: ${importSetLabels.length}, createdBy: ${createdBy}`);

    let {
        invalidMembers,
        membersToInsert,
        stripeCustomersToFetch,
        stripeCustomersToCreate,
        labelAssociationsToInsert
    } = getMemberData({members, labels, importSetLabels, createdBy});

    // NOTE: member insertion has to happen before the rest of insertions to handle validation
    //       errors - remove failed members from label/stripe sets
    debug(`Starting insert of ${membersToInsert.length} members`);
    const insertedMembers = await models.Member.bulkAdd(membersToInsert).then((insertResult) => {
        if (insertResult.unsuccessfulRecords.length) {
            const unsuccessfulIds = insertResult.unsuccessfulRecords.map(r => r.id);

            labelAssociationsToInsert = labelAssociationsToInsert
                .filter(la => !unsuccessfulIds.includes(la.member_id));

            stripeCustomersToFetch = stripeCustomersToFetch
                .filter(sc => !unsuccessfulIds.includes(sc.member_id));

            stripeCustomersToCreate = stripeCustomersToCreate
                .filter(sc => !unsuccessfulIds.includes(sc.member_id));
        }

        debug(`Finished inserting members with ${insertResult.errors.length} errors`);
        if (insertResult.errors.length) {
            insertResult.errors = insertResult.errors.map((error) => {
                if (error.code === 'ER_DUP_ENTRY') {
                    return new errors.ValidationError({
                        message: i18n.t('errors.models.member.memberAlreadyExists.message'),
                        context: i18n.t('errors.models.member.memberAlreadyExists.context', {
                            action: 'add'
                        }),
                        err: error
                    });
                } else {
                    return handleUnrecognizedError(error);
                }
            });
        }

        return insertResult;
    });

    const fetchedStripeCustomersPromise = fetchStripeCustomers(stripeCustomersToFetch);
    const createdStripeCustomersPromise = createStripeCustomers(stripeCustomersToCreate);

    debug(`Starting insert of ${labelAssociationsToInsert.length} label associations`);
    const insertedLabelsPromise = models.Base.Model.bulkAdd(labelAssociationsToInsert, 'members_labels')
        .then((insertResult) => {
            debug(`Finished inserting member label associations with ${insertResult.errors.length} errors`);
            return insertResult;
        });

    const insertedCustomersPromise = Promise.all([
        fetchedStripeCustomersPromise,
        createdStripeCustomersPromise
    ]).then(
        ([fetchedStripeCustomers, createdStripeCustomers]) => {
            const stripeCustomersToInsert = fetchedStripeCustomers.customersToInsert.concat(createdStripeCustomers.customersToInsert);

            debug(`Starting insert of ${stripeCustomersToInsert.length} stripe customers`);
            return models.MemberStripeCustomer.bulkAdd(stripeCustomersToInsert).then((insertResult) => {
                debug(`Finished inserting stripe customers with ${insertResult.errors.length} errors`);

                if (insertResult.errors.length) {
                    insertResult.errors = insertResult.errors.map((error) => {
                        if (error.code === 'ER_DUP_ENTRY') {
                            return new errors.ValidationError({
                                message: i18n.t('errors.models.member_stripe_customer.customerAlreadyExists.message'),
                                context: i18n.t('errors.models.member_stripe_customer.customerAlreadyExists.context'),
                                err: error
                            });
                        } else {
                            return handleUnrecognizedError(error);
                        }
                    });
                }

                return insertResult;
            });
        }
    );

    const insertedSubscriptionsPromise = Promise.all([
        fetchedStripeCustomersPromise,
        createdStripeCustomersPromise,
        insertedCustomersPromise
    ]).then(
        ([fetchedStripeCustomers, createdStripeCustomers, insertedCustomersResult]) => {
            let subscriptionsToInsert = fetchedStripeCustomers.subscriptionsToInsert.concat(createdStripeCustomers.subscriptionsToInsert);

            if (insertedCustomersResult.unsuccessfulRecords.length) {
                const unsuccessfulCustomerIds = insertedCustomersResult.unsuccessfulRecords.map(r => r.customer_id);
                subscriptionsToInsert = subscriptionsToInsert.filter(s => !unsuccessfulCustomerIds.includes(s.customer_id));
            }

            debug(`Starting insert of ${subscriptionsToInsert.length} stripe customer subscriptions`);
            return models.StripeCustomerSubscription.bulkAdd(subscriptionsToInsert)
                .then((insertResult) => {
                    debug(`Finished inserting stripe customer subscriptions with ${insertResult.errors.length} errors`);

                    if (insertResult.errors.length) {
                        insertResult.errors = insertResult.errors.map((error) => {
                            if (error.code === 'ER_DUP_ENTRY') {
                                return new errors.ValidationError({
                                    message: i18n.t('errors.models.stripe_customer_subscription.subscriptionAlreadyExists.message'),
                                    context: i18n.t('errors.models.stripe_customer_subscription.subscriptionAlreadyExists.context'),
                                    err: error
                                });
                            } else {
                                return handleUnrecognizedError(error);
                            }
                        });
                    }

                    return insertResult;
                });
        }
    );

    const deletedMembersPromise = Promise.all([
        fetchedStripeCustomersPromise,
        createdStripeCustomersPromise,
        insertedCustomersPromise,
        insertedSubscriptionsPromise
    ]).then(
        ([fetchedStripeCustomers, createdStripeCustomers, insertedStripeCustomers, insertedStripeSubscriptions]) => {
            const memberIds = [
                ...fetchedStripeCustomers.membersToDelete,
                ...createdStripeCustomers.membersToDelete,
                ...insertedStripeCustomers.unsuccessfulRecords.map(r => r.member_id),
                ...insertedStripeSubscriptions.unsuccessfulRecords.map(r => r.member_id)
            ];

            return models.Member.bulkDestroy(memberIds);
        }
    );

    // This looks sequential, but at the point insertedCustomersPromise has resolved so have all the others
    const insertedSubscriptions = await insertedSubscriptionsPromise;
    const insertedCustomers = await insertedCustomersPromise;
    const deletedMembers = await deletedMembersPromise;
    const fetchedCustomers = await fetchedStripeCustomersPromise;
    const insertedLabels = await insertedLabelsPromise;

    const allErrors = [
        ...insertedMembers.errors,
        ...insertedCustomers.errors,
        ...insertedSubscriptions.errors,
        ...insertedLabels.errors,
        ...fetchedCustomers.errors
    ];
    const importedCount = insertedMembers.successful - deletedMembers.successful;
    const invalidCount = insertedMembers.unsuccessful + invalidMembers.length + deletedMembers.successful + deletedMembers.unsuccessful;

    debug(`Finished members import with ${importedCount} imported, ${invalidCount} invalid and ${allErrors.length} errors`);

    const result = {
        imported: {
            count: importedCount
        },
        invalid: {
            count: invalidCount,
            errors: allErrors
        }
    };

    // Allow logging to happen outside of the request cycle
    process.nextTick(() => {
        result.invalid.errors.forEach(err => logging.error(err));
        deletedMembers.errors.forEach(err => logging.error(err));
        insertedLabels.errors.forEach(err => logging.error(err));
    });

    return result;
};

function serializeMemberLabels(labels) {
    return labels.reduce((labelsAcc, label) => {
        if (!label) {
            return labels;
        }
        if (typeof label !== 'string') {
            return labelsAcc.concat(label.name);
        }
        return labelsAcc.concat(label.trim());
    }, []);
}

function getMemberData({members, labels, importSetLabels, createdBy}) {
    const labelIdLookup = labels.reduce(function (labelIdLookupAcc, labelModel) {
        return Object.assign(labelIdLookupAcc, {
            [labelModel.name]: labelModel.id
        });
    }, {});

    const importedLabels = importSetLabels.map(label => label.name);

    const invalidMembers = [];
    const membersToInsert = [];
    const stripeCustomersToFetch = [];
    const stripeCustomersToCreate = [];
    const labelAssociationsToInsert = [];

    members.forEach(function (member) {
        // @TODO This is expensive, maybe we can just error if we get shoddy data?
        for (let key in member) {
            if (member[key] === 'undefined') {
                delete member[key];
            }
        }

        let subscribed;
        if (_.isUndefined(member.subscribed_to_emails)) {
            // Member's model default
            subscribed = true;
        } else {
            subscribed = (String(member.subscribed_to_emails).toLowerCase() !== 'false');
        }

        let createdAt = member.created_at === '' ? undefined : member.created_at;

        // fixes a formatting issue where inserted dates are showing up as ints and not date times...
        const dateFormat = 'YYYY-MM-DD HH:mm:ss';

        if (createdAt) {
            createdAt = moment(createdAt).format(dateFormat);
        } else {
            createdAt = moment().format(dateFormat);
        }

        const memberToInsert = {
            id: ObjectId.generate(),
            uuid: uuid.v4(), // member model default
            email: member.email,
            name: member.name,
            note: member.note,
            subscribed: subscribed,
            created_at: createdAt,
            created_by: createdBy
        };
        membersToInsert.push(memberToInsert);

        const memberLabels = member.labels
            ? serializeMemberLabels((member.labels || '').split(','))
            : [];
        const allLabels = _.union(memberLabels, importedLabels);

        const memberLabelAssociationsToInsert = allLabels.map((label, index) => {
            return {
                id: ObjectId.generate(),
                member_id: memberToInsert.id,
                label_id: labelIdLookup[label],
                sort_order: index
            };
        });
        labelAssociationsToInsert.push(...memberLabelAssociationsToInsert);

        if (member.stripe_customer_id) {
            const stripeCustomerToFetch = {
                customer_id: member.stripe_customer_id,
                member_id: memberToInsert.id
            };
            stripeCustomersToFetch.push(stripeCustomerToFetch);
        }

        if (String(member.complimentary_plan).toLowerCase() === 'true') {
            const stripeCustomerToCreate = {
                member_id: memberToInsert.id,
                name: memberToInsert.name,
                email: memberToInsert.email
            };
            stripeCustomersToCreate.push(stripeCustomerToCreate);
        }
    });

    return {
        invalidMembers,
        membersToInsert,
        stripeCustomersToFetch,
        stripeCustomersToCreate,
        labelAssociationsToInsert
    };
}

async function createStripeCustomers(stripeCustomersToCreate) {
    const result = {
        errors: [],
        customersToInsert: [],
        subscriptionsToInsert: [],
        membersToDelete: []
    };

    debug(`Creating Stripe customers for ${stripeCustomersToCreate.length} records`);
    await Promise.all(stripeCustomersToCreate.map(async function createStripeCustomer(customerToCreate) {
        try {
            const customer = await membersService.api.members.createStripeCustomer({
                email: customerToCreate.email,
                name: customerToCreate.name
            });

            result.customersToInsert.push({
                id: ObjectId.generate(),
                member_id: customerToCreate.member_id,
                customer_id: customer.id,
                email: customer.email,
                name: customer.name,
                created_at: new Date(),
                updated_at: new Date(),
                created_by: 1,
                updated_by: 1
            });

            const subscription = await membersService.api.members.createComplimentarySubscription(customer);

            const payment = subscription.default_payment_method;
            result.subscriptionsToInsert.push({
                id: ObjectId.generate(),
                customer_id: customer.id,
                subscription_id: subscription.id,
                plan_id: subscription.plan.id,
                status: subscription.status,
                cancel_at_period_end: subscription.cancel_at_period_end,
                current_period_end: new Date(subscription.current_period_end * 1000),
                start_date: new Date(subscription.start_date * 1000),
                default_payment_card_last4: payment && payment.card && payment.card.last4 || null,
                plan_nickname: subscription.plan.nickname || '',
                plan_interval: subscription.plan.interval,
                plan_amount: subscription.plan.amount,
                plan_currency: subscription.plan.currency,
                created_at: new Date(),
                updated_at: new Date(),
                created_by: 1,
                updated_by: 1
            });
        } catch (error) {
            if (error.message.indexOf('customer') && error.code === 'resource_missing') {
                result.errors.push(new errors.NotFoundError({
                    message: `Member not imported. ${error.message}`,
                    context: i18n.t('errors.api.members.stripeCustomerNotFound.context'),
                    help: i18n.t('errors.api.members.stripeCustomerNotFound.help'),
                    err: error,
                    errorDetails: JSON.stringify(customerToCreate)
                }));
            } else {
                result.errors.push(handleUnrecognizedError(error));
            }

            result.membersToDelete.push(customerToCreate.member_id);
        }
    }));

    debug(`Finished creating Stripe customers with ${result.errors.length} errors`);
    return result;
}

async function fetchStripeCustomers(stripeCustomersToInsert) {
    const result = {
        errors: [],
        customersToInsert: [],
        subscriptionsToInsert: [],
        membersToDelete: []
    };

    debug(`Fetching Stripe customers for ${stripeCustomersToInsert.length} records`);

    await Promise.all(stripeCustomersToInsert.map(async function fetchStripeCustomer(customer) {
        try {
            const fetchedCustomer = await membersService.api.members.getStripeCustomer(customer.customer_id, {
                expand: ['subscriptions', 'subscriptions.data.default_payment_method']
            });

            result.customersToInsert.push({
                id: ObjectId.generate(),
                member_id: customer.member_id,
                customer_id: customer.customer_id,
                email: fetchedCustomer.email,
                name: fetchedCustomer.name,
                created_at: new Date(),
                updated_at: new Date(),
                created_by: 1,
                updated_by: 1
            });

            fetchedCustomer.subscriptions.data.forEach((subscription) => {
                const payment = subscription.default_payment_method;
                result.subscriptionsToInsert.push({
                    id: ObjectId.generate(),
                    customer_id: customer.customer_id,
                    subscription_id: subscription.id,
                    plan_id: subscription.plan.id,
                    status: subscription.status,
                    cancel_at_period_end: subscription.cancel_at_period_end,
                    current_period_end: new Date(subscription.current_period_end * 1000),
                    start_date: new Date(subscription.start_date * 1000),
                    default_payment_card_last4: payment && payment.card && payment.card.last4 || null,
                    plan_nickname: subscription.plan.nickname || '',
                    plan_interval: subscription.plan.interval,
                    plan_amount: subscription.plan.amount,
                    plan_currency: subscription.plan.currency,
                    created_at: new Date(),
                    updated_at: new Date(),
                    created_by: 1,
                    updated_by: 1
                });
            });
        } catch (error) {
            if (error.message.indexOf('customer') && error.code === 'resource_missing') {
                result.errors.push(new errors.NotFoundError({
                    message: `Member not imported. ${error.message}`,
                    context: i18n.t('errors.api.members.stripeCustomerNotFound.context'),
                    help: i18n.t('errors.api.members.stripeCustomerNotFound.help'),
                    err: error,
                    errorDetails: JSON.stringify(customer)
                }));
            } else {
                result.errors.push(handleUnrecognizedError(error));
            }

            result.membersToDelete.push(customer.member_id);
        }
    }));

    debug(`Finished fetching Stripe customers with ${result.errors.length} errors`);
    return result;
}

module.exports = doImport;
