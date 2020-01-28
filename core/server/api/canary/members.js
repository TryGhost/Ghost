// NOTE: We must not cache references to membersService.api
// as it is a getter and may change during runtime.
const Promise = require('bluebird');
const models = require('../../models');
const membersService = require('../../services/members');
const common = require('../../lib/common');
const fsLib = require('../../lib/fs');

const decorateWithSubscriptions = async function (member) {
    // NOTE: this logic is here until relations between Members/MemberStripeCustomer/StripeCustomerSubscription
    //       are in place
    const subscriptions = await membersService.api.members.getStripeSubscriptions(member);

    return Object.assign(member, {
        stripe: {
            subscriptions
        }
    });
};

const listMembers = async function (options) {
    const res = (await models.Member.findPage(options));
    const memberModels = res.data.map(model => model.toJSON(options));

    const members = await Promise.all(memberModels.map(async function (member) {
        return decorateWithSubscriptions(member);
    }));

    return {
        members: members,
        meta: res.meta
    };
};

const members = {
    docName: 'members',
    browse: {
        options: [
            'limit',
            'fields',
            'filter',
            'order',
            'debug',
            'page'
        ],
        permissions: true,
        validation: {},
        async query(frame) {
            return listMembers(frame.options);
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
            let model = await models.Member.findOne(frame.data, frame.options);

            if (!model) {
                throw new common.errors.NotFoundError({
                    message: common.i18n.t('errors.api.members.memberNotFound')
                });
            }

            const member = model.toJSON(frame.options);

            return decorateWithSubscriptions(member);
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
            try {
                const model = await models.Member.add(frame.data.members[0], frame.options);

                if (frame.options.send_email) {
                    await membersService.api.sendEmailWithMagicLink(model.get('email'), frame.options.email_type);
                }

                const member = model.toJSON(frame.options);

                return decorateWithSubscriptions(member);
            } catch (error) {
                if (error.code && error.message.toLowerCase().indexOf('unique') !== -1) {
                    throw new common.errors.ValidationError({message: common.i18n.t('errors.api.members.memberAlreadyExists')});
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
            const model = await models.Member.edit(frame.data.members[0], frame.options);

            const member = model.toJSON(frame.options);

            const subscriptions = await membersService.api.members.getStripeSubscriptions(member);
            const compedSubscriptions = subscriptions.filter(sub => (sub.plan.nickname === 'Complimentary'));

            if (frame.data.members[0].comped !== undefined && (frame.data.members[0].comped !== compedSubscriptions)) {
                const hasCompedSubscription = !!(compedSubscriptions.length);

                if (frame.data.members[0].comped && !hasCompedSubscription) {
                    await membersService.api.members.setComplimentarySubscription(member);
                } else if (!(frame.data.members[0].comped) && hasCompedSubscription) {
                    await membersService.api.members.cancelComplimentarySubscription(member);
                }
            }

            return decorateWithSubscriptions(member);
        }
    },

    destroy: {
        statusCode: 204,
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
            frame.options.require = true;

            let member = await models.Member.findOne(frame.data, frame.options);

            if (!member) {
                throw new common.errors.NotFoundError({
                    message: common.i18n.t('errors.api.resource.resourceNotFound', {
                        resource: 'Member'
                    })
                });
            }

            // NOTE: move to a model layer once Members/MemberStripeCustomer relations are in place
            await membersService.api.members.destroyStripeSubscriptions(member);

            await models.Member.destroy(frame.options)
                .catch(models.Member.NotFoundError, () => {
                    throw new common.errors.NotFoundError({
                        message: common.i18n.t('errors.api.resource.resourceNotFound', {
                            resource: 'Member'
                        })
                    });
                });

            return null;
        }
    },

    exportCSV: {
        options: [
            'limit'
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
            return listMembers(frame.options);
        }
    },

    importCSV: {
        statusCode: 201,
        permissions: {
            method: 'add'
        },
        async query(frame) {
            let filePath = frame.file.path,
                fulfilled = 0,
                invalid = 0,
                duplicates = 0;

            return fsLib.readCSV({
                path: filePath,
                columnsToExtract: [{name: 'email', lookup: /email/i}, {name: 'name', lookup: /name/i}, {name: 'note', lookup: /note/i}]
            }).then((result) => {
                return Promise.all(result.map((entry) => {
                    const api = require('./index');

                    return Promise.resolve(api.members.add.query({
                        data: {
                            members: [{
                                email: entry.email,
                                name: entry.name,
                                note: entry.note
                            }]
                        },
                        options: {
                            context: frame.options.context,
                            options: {send_email: false}
                        }
                    })).reflect();
                })).each((inspection) => {
                    if (inspection.isFulfilled()) {
                        fulfilled = fulfilled + 1;
                    } else {
                        if (inspection.reason() instanceof common.errors.ValidationError) {
                            duplicates = duplicates + 1;
                        } else {
                            invalid = invalid + 1;
                        }
                    }
                });
            }).then(() => {
                return {
                    meta: {
                        stats: {
                            imported: fulfilled,
                            duplicates: duplicates,
                            invalid: invalid
                        }
                    }
                };
            });
        }
    }
};

module.exports = members;
