// NOTE: We must not cache references to membersService.api
// as it is a getter and may change during runtime.
const Promise = require('bluebird');
const moment = require('moment-timezone');
const errors = require('@tryghost/errors');
const models = require('../../models');
const membersService = require('../../services/members');

const settingsCache = require('../../../shared/settings-cache');
const tpl = require('@tryghost/tpl');

const messages = {
    memberNotFound: 'Member not found.',
    stripeNotConnected: {
        message: 'Missing Stripe connection.',
        context: 'Attempting to import members with Stripe data when there is no Stripe account connected.',
        help: 'You need to connect to Stripe to import Stripe customers. '
    },
    memberAlreadyExists: {
        message: 'Member already exists',
        context: 'Attempting to {action} member with existing email address.'
    },
    stripeCustomerNotFound: {
        context: 'Missing Stripe customer.',
        help: 'Make sure you’re connected to the correct Stripe Account.'
    },
    resourceNotFound: '{resource} not found.'
};

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
            'search'
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
                    message: tpl(messages.memberNotFound)
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
                        message: tpl(messages.stripeNotConnected.message),
                        context: tpl(messages.stripeNotConnected.context),
                        help: tpl(messages.stripeNotConnected.help),
                        property
                    });
                }

                member = await membersService.api.members.create(frame.data.members[0], frame.options);

                if (frame.data.members[0].stripe_customer_id) {
                    await membersService.api.members.linkStripeCustomer({
                        customer_id: frame.data.members[0].stripe_customer_id,
                        member_id: member.id
                    });
                }

                if (frame.data.members[0].comped) {
                    await membersService.api.members.setComplimentarySubscription(member);
                }

                if (frame.options.send_email) {
                    await membersService.api.sendEmailWithMagicLink({
                        email: member.get('email'), requestedType: frame.options.email_type, options: {
                            forceEmailType: true
                        }
                    });
                }

                return member;
            } catch (error) {
                if (error.code && error.message.toLowerCase().indexOf('unique') !== -1) {
                    throw new errors.ValidationError({
                        message: tpl(messages.memberAlreadyExists.message),
                        context: tpl(messages.memberAlreadyExists.context, {
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
                        error.context = tpl(messages.stripeCustomerNotFound.context);
                        error.help = tpl(messages.stripeCustomerNotFound.help);
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

                const hasCompedSubscription = !!member.related('stripeSubscriptions').find(sub => sub.get('plan_nickname') === 'Complimentary' && sub.get('status') === 'active');

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
                        message: tpl(messages.memberAlreadyExists.message),
                        context: tpl(messages.memberAlreadyExists.context, {
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
            await membersService.api.members.updateSubscription({
                id: frame.options.id,
                subscription: {
                    subscription_id: frame.options.subscription_id,
                    cancel_at_period_end: frame.data.cancel_at_period_end
                }
            });
            let model = await membersService.api.members.get({id: frame.options.id}, {
                withRelated: ['labels', 'stripeSubscriptions', 'stripeSubscriptions.customer']
            });
            if (!model) {
                throw new errors.NotFoundError({
                    message: tpl(messages.memberNotFound)
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
                    message: tpl(messages.resourceNotFound, {
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
            const days = frame.options.days === 'all-time' ? 'all-time' : Number(frame.options.days || 30);

            return await membersService.stats.fetch(days);
        }
    }
};
