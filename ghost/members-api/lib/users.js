const _ = require('lodash');
const debug = require('ghost-ignition').debug('users');
const common = require('./common');

module.exports = function ({
    stripe,
    Member
}) {
    async function createMember({email, name, note, labels, geolocation}) {
        const model = await Member.add({
            email,
            name,
            note,
            labels,
            geolocation
        });
        const member = model.toJSON();
        return member;
    }

    async function getMember(data, options = {}) {
        if (!data.email && !data.id && !data.uuid) {
            return null;
        }
        const model = await Member.findOne(data, options);
        if (!model) {
            return null;
        }
        const member = model.toJSON(options);
        return member;
    }

    async function updateMember(data, options = {}) {
        const attrs = _.pick(data, ['email', 'name', 'note', 'subscribed', 'geolocation']);

        const model = await Member.edit(attrs, options);

        const member = model.toJSON(options);
        return member;
    }

    function deleteMember(options) {
        options = options || {};
        return Member.destroy(options);
    }

    function listMembers(options) {
        return Member.findPage(options).then((models) => {
            return {
                members: models.data.map(model => model.toJSON(options)),
                meta: models.meta
            };
        });
    }

    async function getStripeSubscriptions(member) {
        if (!stripe) {
            return [];
        }

        return await stripe.getActiveSubscriptions(member);
    }

    async function cancelStripeSubscriptions(member) {
        if (stripe) {
            await stripe.cancelAllSubscriptions(member);
        }
    }

    async function setComplimentarySubscription(member) {
        if (stripe) {
            await stripe.setComplimentarySubscription(member);
        }
    }

    async function cancelComplimentarySubscription(member) {
        if (stripe) {
            await stripe.cancelComplimentarySubscription(member);
        }
    }

    async function linkStripeCustomer(id, member) {
        if (stripe) {
            await stripe.linkStripeCustomer(id, member);
        }
    }

    async function getStripeCustomer(id) {
        if (stripe) {
            return await stripe.getStripeCustomer(id);
        }
    }

    async function get(data, options) {
        debug(`get id:${data.id} email:${data.email}`);
        const member = await getMember(data, options);
        if (!member) {
            return member;
        }

        try {
            const subscriptions = await getStripeSubscriptions(member);

            return Object.assign(member, {
                stripe: {
                    subscriptions
                }
            });
        } catch (err) {
            common.logging.error(err);
            return null;
        }
    }

    async function destroy(data, options) {
        debug(`destroy id:${data.id} email:${data.email}`);
        const member = await getMember(data, options);
        if (!member) {
            return;
        }

        await cancelStripeSubscriptions(member);

        return deleteMember(data);
    }

    async function update(data, options) {
        debug(`update id:${options.id}`);

        const member = await updateMember(data, options);
        if (!member) {
            return member;
        }

        try {
            const subscriptions = await getStripeSubscriptions(member);

            return Object.assign(member, {
                stripe: {
                    subscriptions
                }
            });
        } catch (err) {
            common.logging.error(err);
            return null;
        }
    }

    async function list(options) {
        const {meta, members} = await listMembers(options);

        const membersWithSubscriptions = await Promise.all(members.map(async function (member) {
            const subscriptions = await getStripeSubscriptions(member);

            return Object.assign(member, {
                stripe: {
                    subscriptions
                }
            });
        }));

        return {
            meta,
            members: membersWithSubscriptions
        };
    }

    async function create(data) {
        debug(`create email:${data.email}`);

        /** Member.add model method expects label object array*/
        if (data.labels) {
            data.labels.forEach((label, index) => {
                if (_.isString(label)) {
                    data.labels[index] = {name: label};
                }
            });
        }

        const member = await createMember(data);
        return member;
    }

    return {
        create,
        update,
        list,
        get,
        destroy,
        getStripeSubscriptions,
        setComplimentarySubscription,
        cancelComplimentarySubscription,
        cancelStripeSubscriptions,
        getStripeCustomer,
        linkStripeCustomer
    };
};
