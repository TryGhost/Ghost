// NOTE: We must not cache references to membersService.api
// as it is a getter and may change during runtime.
const Promise = require('bluebird');
const moment = require('moment-timezone');
const errors = require('@tryghost/errors');
const config = require('../../../shared/config');
const models = require('../../models');
const membersService = require('../../services/members');
const doImport = require('../../services/members/importer');
const memberLabelsImporter = require('../../services/members/importer/labels');
const settingsCache = require('../../services/settings/cache');
const {i18n} = require('../../lib/common');
const logging = require('../../../shared/logging');
const db = require('../../data/db');
const _ = require('lodash');

/** NOTE: this method should not exist at all and needs to be cleaned up
    it was created due to a bug in how CSV is currently created for exports
    Export bug was fixed in 3.6 but method exists to handle older csv exports with undefined
**/

const cleanupUndefined = (obj) => {
    for (let key in obj) {
        if (obj[key] === 'undefined') {
            delete obj[key];
        }
    }
};

const sanitizeInput = async (members) => {
    const validationErrors = [];
    let invalidCount = 0;

    const jsonSchema = require('./utils/validators/utils/json-schema');

    let invalidValidationCount = 0;
    try {
        await jsonSchema.validate({
            docName: 'members',
            method: 'upload'
        }, {
            data: members
        });
    } catch (error) {
        if (error.errorDetails && error.errorDetails.length) {
            const jsonPointerIndexRegex = /\[(?<index>\d+)\]/;

            let invalidRecordIndexes = error.errorDetails.map((errorDetail) => {
                if (errorDetail.dataPath) {
                    const key = errorDetail.dataPath.split('.').pop();
                    const [, index] = errorDetail.dataPath.match(jsonPointerIndexRegex);
                    validationErrors.push(new errors.ValidationError({
                        message: i18n.t('notices.data.validation.index.schemaValidationFailed', {
                            key
                        }),
                        context: `${key} ${errorDetail.message}`,
                        errorDetails: `${errorDetail.dataPath} with value ${members[index][key]}`
                    }));

                    return Number(index);
                }
            });

            invalidRecordIndexes = _.uniq(invalidRecordIndexes);
            invalidRecordIndexes = invalidRecordIndexes.filter(index => (index !== undefined));

            invalidRecordIndexes.forEach((index) => {
                members[index] = undefined;
            });
            members = members.filter(record => (record !== undefined));
            invalidValidationCount += invalidRecordIndexes.length;
        }
    }

    invalidCount += invalidValidationCount;

    const stripeIsConnected = membersService.config.isStripeConnected();
    const hasStripeConnectedMembers = members.find(member => (member.stripe_customer_id || member.comped));

    if (!stripeIsConnected && hasStripeConnectedMembers) {
        let nonFilteredMembersCount = members.length;
        members = members.filter(member => !(member.stripe_customer_id || member.comped));

        const stripeConnectedMembers = (nonFilteredMembersCount - members.length);
        if (stripeConnectedMembers) {
            invalidCount += stripeConnectedMembers;
            validationErrors.push(new errors.ValidationError({
                message: i18n.t('errors.api.members.stripeNotConnected.message'),
                context: i18n.t('errors.api.members.stripeNotConnected.context'),
                help: i18n.t('errors.api.members.stripeNotConnected.help')
            }));
        }
    }

    const customersMap = members.reduce((acc, member) => {
        if (member.stripe_customer_id && member.stripe_customer_id !== 'undefined') {
            if (acc[member.stripe_customer_id]) {
                acc[member.stripe_customer_id] += 1;
            } else {
                acc[member.stripe_customer_id] = 1;
            }
        }

        return acc;
    }, {});

    const toRemove = [];
    for (const key in customersMap) {
        if (customersMap[key] > 1) {
            toRemove.push(key);
        }
    }

    let sanitized = members.filter((member) => {
        return !(toRemove.includes(member.stripe_customer_id));
    });

    const duplicateStripeCustomersCount = (members.length - sanitized.length);
    if (duplicateStripeCustomersCount) {
        validationErrors.push(new errors.ValidationError({
            message: i18n.t('errors.api.members.duplicateStripeCustomerIds.message'),
            context: i18n.t('errors.api.members.duplicateStripeCustomerIds.context'),
            help: i18n.t('errors.api.members.duplicateStripeCustomerIds.help')
        }));
    }

    invalidCount += duplicateStripeCustomersCount;

    return {
        sanitized,
        invalidCount,
        validationErrors,
        duplicateStripeCustomersCount
    };
};

module.exports = {
    docName: 'members',

    hasActiveStripeSubscriptions: {
        permissions: {
            method: 'browse'
        },
        async query() {
            const hasActiveStripeSubscriptions = await membersService.api.hasActiveStripeSubscriptions();
            return {
                hasActiveStripeSubscriptions
            };
        }
    },

    browse: {
        options: [
            'limit',
            'fields',
            'filter',
            'order',
            'debug',
            'page',
            'search',
            'paid'
        ],
        permissions: true,
        validation: {},
        async query(frame) {
            frame.options.withRelated = ['labels', 'stripeSubscriptions', 'stripeSubscriptions.customer'];
            const page = await membersService.api.members.list(frame.options);

            return page;
        }
    },

    read: {
        headers: {},
        data: [
            'id',
            'email'
        ],
        validation: {},
        permissions: true,
        async query(frame) {
            frame.options.withRelated = ['labels', 'stripeSubscriptions', 'stripeSubscriptions.customer'];
            let model = await membersService.api.members.get(frame.data, frame.options);

            if (!model) {
                throw new errors.NotFoundError({
                    message: i18n.t('errors.api.members.memberNotFound')
                });
            }

            return model;
        }
    },

    add: {
        statusCode: 201,
        headers: {},
        options: [
            'send_email',
            'email_type'
        ],
        validation: {
            data: {
                email: {required: true}
            },
            options: {
                email_type: {
                    values: ['signin', 'signup', 'subscribe']
                }
            }
        },
        permissions: true,
        async query(frame) {
            let member;
            frame.options.withRelated = ['stripeSubscriptions', 'stripeSubscriptions.customer'];
            try {
                if (!membersService.config.isStripeConnected()
                    && (frame.data.members[0].stripe_customer_id || frame.data.members[0].comped)) {
                    const property = frame.data.members[0].comped ? 'comped' : 'stripe_customer_id';

                    throw new errors.ValidationError({
                        message: i18n.t('errors.api.members.stripeNotConnected.message'),
                        context: i18n.t('errors.api.members.stripeNotConnected.context'),
                        help: i18n.t('errors.api.members.stripeNotConnected.help'),
                        property
                    });
                }

                member = await membersService.api.members.create(frame.data.members[0], frame.options);

                if (frame.data.members[0].stripe_customer_id) {
                    await membersService.api.members.linkStripeCustomer(frame.data.members[0].stripe_customer_id, member);
                }

                if (frame.data.members[0].comped) {
                    await membersService.api.members.setComplimentarySubscription(member);
                }

                if (frame.options.send_email) {
                    await membersService.api.sendEmailWithMagicLink({email: member.get('email'), requestedType: frame.options.email_type});
                }

                return member;
            } catch (error) {
                if (error.code && error.message.toLowerCase().indexOf('unique') !== -1) {
                    throw new errors.ValidationError({
                        message: i18n.t('errors.models.member.memberAlreadyExists.message'),
                        context: i18n.t('errors.models.member.memberAlreadyExists.context', {
                            action: 'add'
                        })
                    });
                }

                // NOTE: failed to link Stripe customer/plan/subscription or have thrown custom Stripe connection error.
                //       It's a bit ugly doing regex matching to detect errors, but it's the easiest way that works without
                //       introducing additional logic/data format into current error handling
                const isStripeLinkingError = error.message && (error.message.match(/customer|plan|subscription/g));
                if (member && isStripeLinkingError) {
                    if (error.message.indexOf('customer') && error.code === 'resource_missing') {
                        error.message = `Member not imported. ${error.message}`;
                        error.context = i18n.t('errors.api.members.stripeCustomerNotFound.context');
                        error.help = i18n.t('errors.api.members.stripeCustomerNotFound.help');
                    }

                    await membersService.api.members.destroy({
                        id: member.get('id')
                    }, frame.options);
                }

                throw error;
            }
        }
    },

    edit: {
        statusCode: 200,
        headers: {},
        options: [
            'id'
        ],
        validation: {
            options: {
                id: {
                    required: true
                }
            }
        },
        permissions: true,
        async query(frame) {
            try {
                frame.options.withRelated = ['stripeSubscriptions'];
                const member = await membersService.api.members.update(frame.data.members[0], frame.options);

                const hasCompedSubscription = !!member.related('stripeSubscriptions').find(subscription => subscription.get('plan_nickname') === 'Complimentary');

                if (typeof frame.data.members[0].comped === 'boolean') {
                    if (frame.data.members[0].comped && !hasCompedSubscription) {
                        await membersService.api.members.setComplimentarySubscription(member);
                    } else if (!(frame.data.members[0].comped) && hasCompedSubscription) {
                        await membersService.api.members.cancelComplimentarySubscription(member);
                    }

                    await member.load(['stripeSubscriptions']);
                }

                await member.load(['stripeSubscriptions.customer']);

                return member;
            } catch (error) {
                if (error.code && error.message.toLowerCase().indexOf('unique') !== -1) {
                    throw new errors.ValidationError({
                        message: i18n.t('errors.models.member.memberAlreadyExists.message'),
                        context: i18n.t('errors.models.member.memberAlreadyExists.context', {
                            action: 'edit'
                        })
                    });
                }

                throw error;
            }
        }
    },

    editSubscription: {
        statusCode: 200,
        headers: {},
        options: [
            'id',
            'subscription_id'
        ],
        data: [
            'cancel_at_period_end'
        ],
        validation: {
            options: {
                id: {
                    required: true
                },
                subscription_id: {
                    required: true
                }
            },
            data: {
                cancel_at_period_end: {
                    required: true
                }
            }
        },
        permissions: {
            method: 'edit'
        },
        async query(frame) {
            await membersService.api.members.updateSubscription(frame.options.id, {
                subscriptionId: frame.options.subscription_id,
                cancelAtPeriodEnd: frame.data.cancel_at_period_end
            });
            let model = await membersService.api.members.get({id: frame.options.id}, {
                withRelated: ['labels', 'stripeSubscriptions', 'stripeSubscriptions.customer']
            });
            if (!model) {
                throw new errors.NotFoundError({
                    message: i18n.t('errors.api.members.memberNotFound')
                });
            }

            return model;
        }
    },

    destroy: {
        statusCode: 204,
        headers: {},
        options: [
            'id',
            'cancel'
        ],
        validation: {
            options: {
                id: {
                    required: true
                }
            }
        },
        permissions: true,
        async query(frame) {
            frame.options.require = true;
            frame.options.cancelStripeSubscriptions = frame.options.cancel;

            await Promise.resolve(membersService.api.members.destroy({
                id: frame.options.id
            }, frame.options)).catch(models.Member.NotFoundError, () => {
                throw new errors.NotFoundError({
                    message: i18n.t('errors.api.resource.resourceNotFound', {
                        resource: 'Member'
                    })
                });
            });

            return null;
        }
    },

    exportCSV: {
        options: [
            'limit',
            'filter',
            'search',
            'paid'
        ],
        headers: {
            disposition: {
                type: 'csv',
                value() {
                    const datetime = (new Date()).toJSON().substring(0, 10);
                    return `members.${datetime}.csv`;
                }
            }
        },
        response: {
            format: 'plain'
        },
        permissions: {
            method: 'browse'
        },
        validation: {},
        async query(frame) {
            frame.options.withRelated = ['labels', 'stripeSubscriptions', 'stripeSubscriptions.customer'];
            const page = await membersService.api.members.list(frame.options);

            return page;
        }
    },

    validateImport: {
        permissions: {
            method: 'add'
        },
        headers: {},
        async query(frame) {
            const importedMembers = frame.data.members;

            await Promise.map(importedMembers, (async (entry) => {
                if (entry.stripe_customer_id) {
                    if (!membersService.config.isStripeConnected()) {
                        throw new errors.ValidationError({
                            message: i18n.t('errors.api.members.stripeNotConnected.message', {
                                id: entry.stripe_customer_id
                            }),
                            context: i18n.t('errors.api.members.stripeNotConnected.context'),
                            help: i18n.t('errors.api.members.stripeNotConnected.help')
                        });
                    }

                    try {
                        await membersService.api.members.getStripeCustomer(entry.stripe_customer_id);
                    } catch (error) {
                        throw new errors.ValidationError({
                            message: `Member not imported. ${error.message}`,
                            context: i18n.t('errors.api.members.stripeCustomerNotFound.context'),
                            help: i18n.t('errors.api.members.stripeCustomerNotFound.help')
                        });
                    }
                }
            }));

            return null;
        }
    },

    importCSV: {
        statusCode: 201,
        permissions: {
            method: 'add'
        },
        async query(frame) {
            let imported = {
                count: 0
            };
            let invalid = {
                count: 0,
                errors: []
            };
            let duplicateStripeCustomerIdCount = 0;

            let {importSetLabels, importLabel} = await memberLabelsImporter.handleAllLabels(
                frame.data.labels,
                frame.data.members,
                settingsCache.get('timezone'),
                frame.options
            );

            return Promise.resolve().then(async () => {
                const {sanitized, invalidCount, validationErrors, duplicateStripeCustomersCount} = await sanitizeInput(frame.data.members);
                invalid.count += invalidCount;
                duplicateStripeCustomerIdCount = duplicateStripeCustomersCount;

                if (validationErrors.length) {
                    invalid.errors.push(...validationErrors);
                }

                return Promise.map(sanitized, ((entry) => {
                    const api = require('./index');
                    entry.labels = (entry.labels && entry.labels.split(',')) || [];
                    const entryLabels = memberLabelsImporter.serializeMemberLabels(entry.labels);
                    const mergedLabels = _.unionBy(entryLabels, importSetLabels, 'name');

                    cleanupUndefined(entry);

                    let subscribed;
                    if (_.isUndefined(entry.subscribed_to_emails)) {
                        subscribed = entry.subscribed_to_emails;
                    } else {
                        subscribed = (String(entry.subscribed_to_emails).toLowerCase() !== 'false');
                    }

                    return Promise.resolve(api.members.add.query({
                        data: {
                            members: [{
                                email: entry.email,
                                name: entry.name,
                                note: entry.note,
                                subscribed: subscribed,
                                stripe_customer_id: entry.stripe_customer_id,
                                comped: (String(entry.complimentary_plan).toLocaleLowerCase() === 'true'),
                                labels: mergedLabels,
                                created_at: entry.created_at === '' ? undefined : entry.created_at
                            }]
                        },
                        options: {
                            context: frame.options.context,
                            options: {send_email: false}
                        }
                    })).reflect();
                }), {concurrency: 10})
                    .each((inspection) => {
                        if (inspection.isFulfilled()) {
                            imported.count = imported.count + 1;
                        } else {
                            const error = inspection.reason();

                            // NOTE: if the error happens as a result of pure API call it doesn't get logged anywhere
                            //       for this reason we have to make sure any unexpected errors are logged here
                            if (Array.isArray(error)) {
                                logging.error(error[0]);
                                invalid.errors.push(...error);
                            } else {
                                logging.error(error);
                                invalid.errors.push(error);
                            }

                            invalid.count = invalid.count + 1;
                        }
                    });
            }).then(async () => {
                // NOTE: grouping by context because messages can contain unique data like "customer_id"
                const groupedErrors = _.groupBy(invalid.errors, 'context');
                const uniqueErrors = _.uniqBy(invalid.errors, 'context');

                const outputErrors = uniqueErrors.map((error) => {
                    let errorGroup = groupedErrors[error.context];
                    let errorCount = errorGroup.length;

                    if (error.message === i18n.t('errors.api.members.duplicateStripeCustomerIds.message')) {
                        errorCount = duplicateStripeCustomerIdCount;
                    }

                    // NOTE: filtering only essential error information, so API doesn't leak more error details than it should
                    return {
                        message: error.message,
                        context: error.context,
                        help: error.help,
                        count: errorCount
                    };
                });

                invalid.errors = outputErrors;

                if (imported.count === 0 && importLabel && importLabel.generated) {
                    await models.Label.destroy(Object.assign({}, {id: importLabel.id}, frame.options));
                    importLabel = null;
                }

                return {
                    meta: {
                        stats: {
                            imported,
                            invalid
                        },
                        import_label: importLabel
                    }
                };
            });
        }
    },

    importCSVBatched: {
        statusCode: 201,
        permissions: {
            method: 'add'
        },
        async query(frame) {
            let imported = {
                count: 0
            };
            let invalid = {
                count: 0,
                errors: []
            };
            let duplicateStripeCustomerIdCount = 0;

            // NOTE: redacted copy from models.Base module
            const contextUser = (options) => {
                options = options || {};
                options.context = options.context || {};

                if (options.context.user || models.Base.Model.isExternalUser(options.context.user)) {
                    return options.context.user;
                } else if (options.context.integration) {
                    return models.Base.Model.internalUser;
                }
            };

            const createdBy = contextUser(frame.options);

            let {allLabels, importSetLabels, importLabel} = await memberLabelsImporter.handleAllLabels(
                frame.data.labels,
                frame.data.members,
                settingsCache.get('timezone'),
                frame.options
            );

            return Promise.resolve().then(async () => {
                const {sanitized, invalidCount, validationErrors, duplicateStripeCustomersCount} = await sanitizeInput(frame.data.members);
                invalid.count += invalidCount;
                duplicateStripeCustomerIdCount = duplicateStripeCustomersCount;

                if (validationErrors.length) {
                    invalid.errors.push(...validationErrors);
                }

                return doImport({
                    members: sanitized,
                    labels: allLabels,
                    importSetLabels,
                    createdBy
                });
            }).then(async (result) => {
                invalid.errors = invalid.errors.concat(result.invalid.errors);
                invalid.count += result.invalid.count;
                imported.count += result.imported.count;
                // NOTE: grouping by context because messages can contain unique data like "customer_id"
                const groupedErrors = _.groupBy(invalid.errors, 'context');
                const uniqueErrors = _.uniqBy(invalid.errors, 'context');

                const outputErrors = uniqueErrors.map((error) => {
                    let errorGroup = groupedErrors[error.context];
                    let errorCount = errorGroup.length;

                    if (error.message === i18n.t('errors.api.members.duplicateStripeCustomerIds.message')) {
                        errorCount = duplicateStripeCustomerIdCount;
                    }

                    // NOTE: filtering only essential error information, so API doesn't leak more error details than it should
                    return {
                        message: error.message,
                        context: error.context,
                        help: error.help,
                        count: errorCount
                    };
                });

                invalid.errors = outputErrors;

                if (imported.count === 0 && importLabel && importLabel.generated) {
                    await models.Label.destroy(Object.assign({}, {id: importLabel.id}, frame.options));
                    importLabel = null;
                }

                return {
                    meta: {
                        stats: {
                            imported,
                            invalid
                        },
                        import_label: importLabel
                    }
                };
            });
        }
    },

    stats: {
        options: [
            'days'
        ],
        permissions: {
            method: 'browse'
        },
        validation: {
            options: {
                days: {
                    values: ['30', '90', '365', 'all-time']
                }
            }
        },
        async query(frame) {
            const dateFormat = 'YYYY-MM-DD HH:mm:ss';
            const isSQLite = config.get('database:client') === 'sqlite3';
            const siteTimezone = settingsCache.get('timezone');
            const tzOffsetMins = moment.tz(siteTimezone).utcOffset();

            const days = frame.options.days === 'all-time' ? 'all-time' : Number(frame.options.days || 30);

            // get total members before other stats because the figure is used multiple times
            async function getTotalMembers() {
                const result = await db.knex.raw('SELECT COUNT(id) AS total FROM members');
                return isSQLite ? result[0].total : result[0][0].total;
            }
            const totalMembers = await getTotalMembers();

            async function getTotalMembersInRange() {
                if (days === 'all-time') {
                    return totalMembers;
                }

                const startOfRange = moment.tz(siteTimezone).subtract(days - 1, 'days').startOf('day').utc().format(dateFormat);
                const result = await db.knex.raw('SELECT COUNT(id) AS total FROM members WHERE created_at >= ?', [startOfRange]);
                return isSQLite ? result[0].total : result[0][0].total;
            }

            async function getTotalMembersOnDatesInRange() {
                const startOfRange = moment.tz(siteTimezone).subtract(days - 1, 'days').startOf('day').utc().format(dateFormat);
                let result;

                if (isSQLite) {
                    const dateModifier = `+${tzOffsetMins} minutes`;

                    result = await db.knex('members')
                        .select(db.knex.raw('DATE(created_at, ?) AS created_at, COUNT(DATE(created_at, ?)) AS count', [dateModifier, dateModifier]))
                        .where((builder) => {
                            if (days !== 'all-time') {
                                builder.whereRaw('created_at >= ?', [startOfRange]);
                            }
                        }).groupByRaw('DATE(created_at, ?)', [dateModifier]);
                } else {
                    const mins = tzOffsetMins % 60;
                    const hours = (tzOffsetMins - mins) / 60;
                    const utcOffset = `${Math.sign(tzOffsetMins) === -1 ? '-' : '+'}${hours}:${mins < 10 ? '0' : ''}${mins}`;

                    result = await db.knex('members')
                        .select(db.knex.raw('DATE(CONVERT_TZ(created_at, \'+00:00\', ?)) AS created_at, COUNT(CONVERT_TZ(created_at, \'+00:00\', ?)) AS count', [utcOffset, utcOffset]))
                        .where((builder) => {
                            if (days !== 'all-time') {
                                builder.whereRaw('created_at >= ?', [startOfRange]);
                            }
                        })
                        .groupByRaw('DATE(CONVERT_TZ(created_at, \'+00:00\', ?))', [utcOffset]);
                }

                // sql doesn't return rows with a 0 count so we build an object
                // with sparse results to reference by date rather than performing
                // multiple finds across an array
                const resultObject = {};
                result.forEach((row) => {
                    resultObject[moment(row.created_at).format('YYYY-MM-DD')] = row.count;
                });

                // loop over every date in the range so we can return a contiguous range object
                const totalInRange = Object.values(resultObject).reduce((acc, value) => acc + value, 0);
                let runningTotal = totalMembers - totalInRange;
                let currentRangeDate;

                if (days === 'all-time') {
                    // start from the date of first created member
                    currentRangeDate = moment(moment(result[0].created_at).format('YYYY-MM-DD')).tz(siteTimezone);
                } else {
                    currentRangeDate = moment.tz(siteTimezone).subtract(days - 1, 'days');
                }

                let endDate = moment.tz(siteTimezone).add(1, 'hour');
                const output = {};

                while (currentRangeDate.isBefore(endDate)) {
                    let dateStr = currentRangeDate.format('YYYY-MM-DD');
                    runningTotal += resultObject[dateStr] || 0;
                    output[dateStr] = runningTotal;

                    currentRangeDate = currentRangeDate.add(1, 'day');
                }

                return output;
            }

            async function getNewMembersToday() {
                const startOfToday = moment.tz(siteTimezone).startOf('day').utc().format(dateFormat);
                const result = await db.knex.raw('SELECT count(id) AS total FROM members WHERE created_at >= ?', [startOfToday]);
                return isSQLite ? result[0].total : result[0][0].total;
            }

            // perform final calculations in parallel
            const results = await Promise.props({
                total: totalMembers,
                total_in_range: getTotalMembersInRange(),
                total_on_date: getTotalMembersOnDatesInRange(),
                new_today: getNewMembersToday()
            });

            return results;
        }
    }
};
// NOTE: remove below condition once batched import is production ready,
//       remember to swap out current importCSV method when doing so
if (config.get('enableDeveloperExperiments')) {
    module.exports.importCSV = module.exports.importCSVBatched;
    delete module.exports.importCSVBatched;
}
