// NOTE: We must not cache references to membersService.api
// as it is a getter and may change during runtime.
const Promise = require('bluebird');
const moment = require('moment-timezone');
const errors = require('@tryghost/errors');
const models = require('../../models');
const membersService = require('../../services/members');
const labsService = require('../../../shared/labs');

const settingsCache = require('../../../shared/settings-cache');
const i18n = require('../../../shared/i18n');
const _ = require('lodash');

const allowedIncludes = ['email_recipients', 'products'];

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
            'search'
        ],
        permissions: true,
        validation: {},
        async query(frame) {
            frame.options.withRelated = ['labels', 'stripeSubscriptions', 'stripeSubscriptions.customer', 'stripeSubscriptions.stripePrice', 'stripeSubscriptions.stripePrice.stripeProduct'];
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
            const defaultWithRelated = ['labels', 'stripeSubscriptions', 'stripeSubscriptions.customer', 'stripeSubscriptions.stripePrice', 'stripeSubscriptions.stripePrice.stripeProduct'];

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
            frame.options.withRelated = ['stripeSubscriptions', 'products', 'labels', 'stripeSubscriptions.stripePrice', 'stripeSubscriptions.stripePrice.stripeProduct'];
            if (!labsService.isSet('multipleProducts')) {
                delete frame.data.products;
            }
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
                    await membersService.api.members.linkStripeCustomer({
                        customer_id: frame.data.members[0].stripe_customer_id,
                        member_id: member.id
                    }, frame.options);
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
            if (!labsService.isSet('multipleProducts')) {
                delete frame.data.products;
            }
            try {
                frame.options.withRelated = ['stripeSubscriptions', 'products', 'labels', 'stripeSubscriptions.stripePrice', 'stripeSubscriptions.stripePrice.stripeProduct'];
                const member = await membersService.api.members.update(frame.data.members[0], frame.options);

                const hasCompedSubscription = !!member.related('stripeSubscriptions').find(sub => sub.get('plan_nickname') === 'Complimentary' && sub.get('status') === 'active');

                if (typeof frame.data.members[0].comped === 'boolean') {
                    if (frame.data.members[0].comped && !hasCompedSubscription) {
                        await membersService.api.members.setComplimentarySubscription(member);
                    } else if (!(frame.data.members[0].comped) && hasCompedSubscription) {
                        await membersService.api.members.cancelComplimentarySubscription(member);
                    }

                    await member.load(['stripeSubscriptions', 'products', 'stripeSubscriptions.stripePrice', 'stripeSubscriptions.stripePrice.stripeProduct']);
                }

                await member.load(['stripeSubscriptions.customer', 'stripeSubscriptions.stripePrice', 'stripeSubscriptions.stripePrice.stripeProduct']);

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
            'cancel_at_period_end',
            'status'
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
                },
                status: {
                    values: ['canceled']
                }
            }
        },
        permissions: {
            method: 'edit'
        },
        async query(frame) {
            if (frame.data.status === 'canceled') {
                await membersService.api.members.cancelSubscription({
                    id: frame.options.id,
                    subscription: {
                        subscription_id: frame.options.subscription_id
                    }
                });
            } else {
                await membersService.api.members.updateSubscription({
                    id: frame.options.id,
                    subscription: {
                        subscription_id: frame.options.subscription_id,
                        cancel_at_period_end: frame.data.cancel_at_period_end
                    }
                });
            }
            let model = await membersService.api.members.get({id: frame.options.id}, {
                withRelated: ['labels', 'products', 'stripeSubscriptions', 'stripeSubscriptions.customer', 'stripeSubscriptions.stripePrice', 'stripeSubscriptions.stripePrice.stripeProduct']
            });
            if (!model) {
                throw new errors.NotFoundError({
                    message: i18n.t('errors.api.members.memberNotFound')
                });
            }

            return model;
        }
    },

    createSubscription: {
        statusCode: 200,
        headers: {},
        options: [
            'id'
        ],
        data: [
            'stripe_price_id'
        ],
        validation: {
            options: {
                id: {
                    required: true
                }
            },
            data: {
                stripe_price_id: {
                    required: true
                }
            }
        },
        permissions: {
            method: 'edit'
        },
        async query(frame) {
            await membersService.api.members.createSubscription({
                id: frame.options.id,
                subscription: {
                    stripe_price_id: frame.data.stripe_price_id
                }
            });
            let model = await membersService.api.members.get({id: frame.options.id}, {
                withRelated: ['labels', 'products', 'stripeSubscriptions', 'stripeSubscriptions.customer', 'stripeSubscriptions.stripePrice', 'stripeSubscriptions.stripePrice.stripeProduct']
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

    bulkDestroy: {
        statusCode: 200,
        headers: {},
        options: [
            'all',
            'filter',
            'search'
        ],
        permissions: {
            method: 'destroy'
        },
        async query(frame) {
            const bulkDestroyResult = await membersService.api.members.bulkDestroy(frame.options);

            // shaped to match the importer response
            return {
                meta: {
                    stats: {
                        successful: bulkDestroyResult.successful,
                        unsuccessful: bulkDestroyResult.unsuccessful
                    },
                    unsuccessfulIds: bulkDestroyResult.unsuccessfulIds,
                    errors: bulkDestroyResult.errors
                }
            };
        }
    },

    exportCSV: {
        options: [
            'limit',
            'filter',
            'search'
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
            if (labsService.isSet('multipleProducts')) {
                frame.options.withRelated.push('products');
            }
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

            return membersService.processImport({
                pathToCSV,
                headerMapping,
                globalLabels,
                importLabel,
                LabelModel: models.Label,
                user: {
                    email: frame.user.get('email')
                }
            });
        }
    },

    memberStats: {
        permissions: {
            method: 'browse'
        },
        async query() {
            const memberStats = await membersService.api.events.getStatuses();
            let totalMembers = _.last(memberStats) ? (_.last(memberStats).paid + _.last(memberStats).free + _.last(memberStats).comped) : 0;

            return {
                resource: 'members',
                total: totalMembers,
                data: memberStats.map((d) => {
                    const {paid, free, comped} = d;
                    return {
                        date: moment(d.date).format('YYYY-MM-DD'),
                        paid, free, comped
                    };
                })
            };
        }
    },

    mrrStats: {
        permissions: {
            method: 'browse'
        },
        async query() {
            const mrrData = await membersService.api.events.getMRR();
            const mrrStats = Object.keys(mrrData).map((curr) => {
                return {
                    currency: curr,
                    data: mrrData[curr].map((d) => {
                        return Object.assign({}, {
                            date: moment(d.date).format('YYYY-MM-DD'),
                            value: d.mrr
                        });
                    })
                };
            });
            return {
                resource: 'mrr',
                data: mrrStats
            };
        }
    },
    subscriberStats: {
        permissions: {
            method: 'browse'
        },
        async query() {
            const statsData = await membersService.api.events.getSubscriptions();
            const totalSubscriptions = (_.last(statsData) && _.last(statsData).subscribed) || 0;
            statsData.forEach((d) => {
                d.date = moment(d.date).format('YYYY-MM-DD');
            });
            return {
                resource: 'subscribers',
                total: totalSubscriptions,
                data: statsData.map((d) => {
                    return Object.assign({}, {
                        date: moment(d.date).format('YYYY-MM-DD'),
                        value: d.subscribed
                    });
                })
            };
        }
    },
    grossVolumeStats: {
        permissions: {
            method: 'browse'
        },
        async query() {
            const volumeData = await membersService.api.events.getVolume();
            const volumeStats = Object.keys(volumeData).map((curr) => {
                return {
                    currency: curr,
                    data: volumeData[curr].map((d) => {
                        return Object.assign({}, {
                            date: moment(d.date).format('YYYY-MM-DD'),
                            value: d.volume
                        });
                    })
                };
            });
            return {
                resource: 'gross-volume',
                data: volumeStats
            };
        }
    },

    activityFeed: {
        options: [
            'limit'
        ],
        permissions: {
            method: 'browse'
        },
        async query(frame) {
            const events = await membersService.api.events.getEventTimeline(frame.options);
            return {
                events
            };
        }
    }
};
