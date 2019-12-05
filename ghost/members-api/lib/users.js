const debug = require('ghost-ignition').debug('users');

let Member;

async function createMember({email, name, note}, options = {}) {
    const model = await Member.add({
        email,
        name: name || null,
        note: note || null
    });
    const member = model.toJSON(options);
    return member;
}

async function getMember(data, options = {}) {
    if (!data.email && !data.id && !data.uuid) {
        return Promise.resolve(null);
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
        name: name || null,
        note: note || null
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
    sendEmailWithMagicLink,
    stripe,
    memberModel
}) {
    Member = memberModel;

    async function get(data, options) {
        debug(`get id:${data.id} email:${data.email}`);
        const member = await getMember(data, options);
        if (!member) {
            return member;
        }

        if (!stripe) {
            return Object.assign(member, {
                stripe: {
                    subscriptions: []
                }
            });
        }
        try {
            const subscriptions = await stripe.getActiveSubscriptions(member);

            return Object.assign(member, {
                stripe: {
                    subscriptions
                }
            });
        } catch (err) {
            console.log(err);
            return null;
        }
    }

    async function destroy(data, options) {
        debug(`destroy id:${data.id} email:${data.email}`);
        const member = await getMember(data, options);
        if (!member) {
            return;
        }
        if (stripe) {
            await stripe.cancelAllSubscriptions(member);
        }
        return deleteMember(data, options);
    }

    async function update(data, options) {
        debug(`update id:${options.id}`);
        await getMember({id: options.id});
        return updateMember(data, options);
    }

    async function list(options) {
        const {meta, members} = await listMembers(options);

        const membersWithSubscriptions = await Promise.all(members.map(async function (member) {
            if (!stripe) {
                return Object.assign(member, {
                    stripe: {
                        subscriptions: []
                    }
                });
            }

            const subscriptions = await stripe.getActiveSubscriptions(member);

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

    async function create(data, options = {}) {
        debug(`create email:${data.email}`);
        const member = await createMember(data);
        if (options.sendEmail) {
            debug(`create sending email to ${member.email}`);
            await sendEmailWithMagicLink(member.email, options.emailType);
        }
        return member;
    }

    return {
        create,
        update,
        list,
        get,
        destroy
    };
};
