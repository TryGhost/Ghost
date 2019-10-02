const debug = require('ghost-ignition').debug('users');
module.exports = function ({
    sendEmailWithMagicLink,
    stripe,
    createMember,
    getMember,
    updateMember,
    listMembers,
    deleteMember
}) {
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
        return listMembers(options);
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
