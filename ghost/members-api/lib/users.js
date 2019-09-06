module.exports = function ({
    stripe,
    createMember,
    getMember,
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
                plans: []
            });
        }
        try {
            const subscription = await stripe.getSubscription(member);
            if (subscription.status !== 'active') {
                return Object.assign(member, {
                    plans: []
                });
            }

            return Object.assign(member, {
                plans: [subscription.plan]
            });
        } catch (err) {
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

    return {
        create: createMember,
        list: listMembers,
        get,
        destroy
    };
};
