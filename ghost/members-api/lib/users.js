module.exports = function ({
    stripe,
    createMember,
    getMember,
    updateMember,
    listMembers,
    deleteMember
}) {
    async function get(data, options) {
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
        const member = await getMember(data, options);
        if (!member) {
            return;
        }
        if (stripe) {
            await stripe.removeCustomer(member);
        }
        return deleteMember(data, options);
    }

    async function update(data, options) {
        return updateMember(data, options);
    }

    async function list(data, options) {
        return listMembers(data, options);
    }

    async function create(data, options) {
        return createMember(data, options);
    }

    return {
        create,
        update,
        list,
        get,
        destroy
    };
};
