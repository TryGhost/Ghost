// NOTE: We must not cache references to membersService.api
// as it is a getter and may change during runtime.
const moment = require('moment-timezone');
const errors = require('@tryghost/errors');
const logging = require('@tryghost/logging');
const models = require('../../models');
const membersService = require('../../services/members');

const settingsCache = require('../../../shared/settings-cache');
const tpl = require('@tryghost/tpl');
const _ = require('lodash');

const messages = {
    memberNotFound: 'Member not found.',
    notSendingWelcomeEmail: 'Email verification required, welcome email is disabled',
    memberAlreadyExists: {
        message: 'Member already exists',
        context: 'Attempting to {action} member with existing email address.'
    },
    stripeNotConnected: {
        message: 'Missing Stripe connection.',
        context: 'Attempting to import members with Stripe data when there is no Stripe account connected.',
        help: 'help'
    },
    stripeCustomerNotFound: {
        context: 'Missing Stripe customer.',
        help: 'Make sure you’re connected to the correct Stripe Account.'
    },
    resourceNotFound: '{resource} not found.'
};

const allowedIncludes = ['email_recipients', 'products', 'tiers'];

/** @type {import('@tryghost/api-framework').Controller} */
const controller = {
    docName: 'members',

    browse: {
        headers: {
            cacheInvalidate: false
        },
        options: [
            'limit',
            'fields',
            'filter',
            'order',
            'debug',
            'page',
            'search',
            'include'
        ],
        permissions: true,
        validation: {
            options: {
                include: {
                    values: allowedIncludes
                }
            }
        },
        async query(frame) {
            const page = await membersService.api.memberBREADService.browse(frame.options);

            return page;
        }
    },

    read: {
        options: [
            'include'
        ],
        headers: {
            cacheInvalidate: false
        },
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
            const member = await membersService.api.memberBREADService.read(frame.data, frame.options);

            if (!member) {
                throw new errors.NotFoundError({
                    message: tpl(messages.memberNotFound)
                });
            }

            return member;
        }
    },

    add: {
        statusCode: 201,
        headers: {
            cacheInvalidate: false
        },
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
            if (await membersService.verificationTrigger.checkVerificationRequired()) {
                logging.warn(tpl(messages.notSendingWelcomeEmail));
                frame.options.send_email = false;
            }
            const member = await membersService.api.memberBREADService.add(frame.data.members[0], frame.options);

            return member;
        }
    },

    edit: {
        statusCode: 200,
        headers: {
            cacheInvalidate: false
        },
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
            const member = await membersService.api.memberBREADService.edit(frame.data.members[0], frame.options);

            return member;
        }
    },

    logout: {
        statusCode: 204,
        headers: {
            cacheInvalidate: false
        },
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
        permissions: {
            method: 'edit'
        },
        async query(frame) {
            const member = await membersService.api.memberBREADService.logout(frame.options);

            return member;
        }
    },

    editSubscription: {
        statusCode: 200,
        headers: {
            cacheInvalidate: false
        },
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
            let model = await membersService.api.memberBREADService.read({id: frame.options.id});
            if (!model) {
                throw new errors.NotFoundError({
                    message: tpl(messages.memberNotFound)
                });
            }

            return model;
        }
    },

    createSubscription: {
        statusCode: 200,
        headers: {
            cacheInvalidate: false
        },
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
            let model = await membersService.api.memberBREADService.read({id: frame.options.id});
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
        headers: {
            cacheInvalidate: false
        },
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
            return membersService.api.members.destroy({
                id: frame.options.id
            }, {
                ...frame.options, require: true, cancelStripeSubscriptions: frame.options.cancel
            });
        }
    },

    bulkDestroy: {
        statusCode: 200,
        headers: {
            cacheInvalidate: false
        },
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

    bulkEdit: {
        statusCode: 200,
        headers: {
            cacheInvalidate: false
        },
        options: [
            'all',
            'filter',
            'search'
        ],
        data: [
            'action',
            'meta'
        ],
        validation: {
            data: {
                action: {
                    required: true,
                    values: ['unsubscribe', 'addLabel', 'removeLabel']
                }
            }
        },
        permissions: {
            method: 'edit'
        },
        async query(frame) {
            return membersService.api.members.bulkEdit(frame.data.bulk, frame.options);
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
            },
            cacheInvalidate: false
        },
        response: {
            format: 'plain'
        },
        permissions: {
            method: 'browse'
        },
        validation: {},
        async query(frame) {
            return {
                data: await membersService.export(frame.options)
            };
        }
    },

    importCSV: {
        headers: {
            cacheInvalidate: false
        },
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

            let email;
            if (frame.user) {
                email = frame.user.get('email');
            } else {
                email = await models.User.getOwnerUser().get('email');
            }

            return membersService.processImport({
                pathToCSV,
                headerMapping,
                globalLabels,
                importLabel,
                LabelModel: models.Label,
                user: {
                    email: email
                }
            });
        }
    },

    memberStats: {
        headers: {
            cacheInvalidate: false
        },
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
        headers: {
            cacheInvalidate: false
        },
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

    activityFeed: {
        headers: {
            cacheInvalidate: false
        },
        options: [
            'limit',
            'filter'
        ],
        permissions: {
            method: 'browse'
        },
        async query(frame) {
            return await membersService.api.events.getEventTimeline(frame.options);
        }
    }
};

module.exports = controller;
