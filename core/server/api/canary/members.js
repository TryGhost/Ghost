// NOTE: We must not cache references to membersService.api
// as it is a getter and may change during runtime.
const Promise = require('bluebird');
const moment = require('moment-timezone');
const errors = require('@tryghost/errors');
const GhostMailer = require('../../services/mail').GhostMailer;
const config = require('../../../shared/config');
const models = require('../../models');
const membersService = require('../../services/members');
const jobsService = require('../../services/jobs');
const settingsCache = require('../../services/settings/cache');
const {i18n} = require('../../lib/common');
const db = require('../../data/db');

const ghostMailer = new GhostMailer();
const allowedIncludes = ['email_recipients'];

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
        options: [
            'include'
        ],
        headers: {},
        data: [
            'id',
            'email'
        ],
        validation: {
            options: {
                include: {
                    values: allowedIncludes
                }
            }
        },
        permissions: true,
        async query(frame) {
            const defaultWithRelated = ['labels', 'stripeSubscriptions', 'stripeSubscriptions.customer'];

            if (!frame.options.withRelated) {
                frame.options.withRelated = defaultWithRelated;
            } else {
                frame.options.withRelated = frame.options.withRelated.concat(defaultWithRelated);
            }

            if (frame.options.withRelated.includes('email_recipients')) {
                frame.options.withRelated.push('email_recipients.email');
            }

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

    importCSV: {
        statusCode(result) {
            if (result && result.meta && result.meta.stats && result.meta.stats.imported !== null) {
                return 201;
            } else {
                return 202;
            }
        },
        permissions: {
            method: 'add'
        },
        async query(frame) {
            const siteTimezone = settingsCache.get('timezone');

            const importLabel = {
                name: `Import ${moment().tz(siteTimezone).format('YYYY-MM-DD HH:mm')}`
            };

            const globalLabels = [importLabel].concat(frame.data.labels);
            const pathToCSV = frame.file.path;
            const headerMapping = frame.data.mapping;
            const job = await membersService.importer.prepare(pathToCSV, headerMapping, globalLabels, {
                createdBy: frame.user.id
            });

            if (job.batches <= 500 && !job.metadata.hasStripeData) {
                const result = await membersService.importer.perform(job.id);
                const importLabelModel = result.imported ? await models.Label.findOne(importLabel) : null;
                return {
                    meta: {
                        stats: {
                            imported: result.imported,
                            invalid: result.errors
                        },
                        import_label: importLabelModel
                    }
                };
            } else {
                const emailRecipient = frame.user.get('email');
                jobsService.addJob(async () => {
                    const result = await membersService.importer.perform(job.id);
                    const importLabelModel = result.imported ? await models.Label.findOne(importLabel) : null;
                    const emailContent = membersService.importer.generateCompletionEmail(result, {
                        emailRecipient,
                        importLabel: importLabelModel ? importLabelModel.toJSON() : null
                    });
                    const errorCSV = membersService.importer.generateErrorCSV(result);
                    const emailSubject = result.imported > 0 ? 'Your member import is complete' : 'Your member import was unsuccessful';

                    await ghostMailer.send({
                        to: emailRecipient,
                        subject: emailSubject,
                        html: emailContent,
                        forceTextContent: true,
                        attachments: [{
                            filename: `${importLabel.name} - Errors.csv`,
                            contents: errorCSV,
                            contentType: 'text/csv',
                            contentDisposition: 'attachment'
                        }]
                    });
                });

                return {};
            }
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
                    const dateModifier = `${Math.sign(tzOffsetMins) === -1 ? '' : '+'}${tzOffsetMins} minutes`;

                    result = await db.knex('members')
                        .select(db.knex.raw('DATE(created_at, ?) AS created_at, COUNT(DATE(created_at, ?)) AS count', [dateModifier, dateModifier]))
                        .where((builder) => {
                            if (days !== 'all-time') {
                                builder.whereRaw('created_at >= ?', [startOfRange]);
                            }
                        }).groupByRaw('DATE(created_at, ?)', [dateModifier]);
                } else {
                    const mins = Math.abs(tzOffsetMins) % 60;
                    const hours = (Math.abs(tzOffsetMins) - mins) / 60;
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
