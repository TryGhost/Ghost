const debug = require('ghost-ignition').debug('users');
const common = require('./common');

let Member;

async function createMember({email, name, note}) {
    const model = await Member.add({
        email,
        name,
        note
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

async function updateMember({name, note, subscribed}, options = {}) {
    const attrs = {
        name,
        note
    };

    if (subscribed !== undefined) {
        attrs.subscribed = subscribed;
    }

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

module.exports = function ({
    stripe,
    memberModel
}) {
    Member = memberModel;

    async function getStripeSubscriptions(member) {
        if (!stripe) {
            return [];
        }

        return await stripe.getActiveSubscriptions(member);
    }

    async function destroyStripeSubscriptions(member) {
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

        await destroyStripeSubscriptions(member);

        return deleteMember(data);
    }

    async function update(data, options) {
        debug(`update id:${options.id}`);

        return updateMember(data, options);
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
        destroyStripeSubscriptions
    };
};
