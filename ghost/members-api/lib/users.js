module.exports = function ({
    subscriptions,
    createMember,
    updateMember,
    getMember,
    listMembers,
    deleteMember,
    validateMember,
    sendEmail,
    encodeToken,
    decodeToken
}) {
    function requestPasswordReset({email}) {
        return getMember({email}).then((member) => {
            return encodeToken({
                sub: member.id
            }).then((token) => {
                return sendEmail(member, {token});
            });
        }, (/*err*/) => {
            // Ignore user not found err;
        });
    }

    function resetPassword({token, password}) {
        return decodeToken(token).then(({sub}) => {
            return updateMember({id: sub}, {password});
        });
    }

    function get(...args) {
        return getMember(...args).then((member) => {
            return subscriptions.getAdapters().then((adapters) => {
                return Promise.all(adapters.map((adapter) => {
                    return subscriptions.getSubscription(member, {
                        adapter
                    }).then((subscription) => {
                        return Object.assign(subscription, {adapter});
                    });
                }));
            }).then((subscriptions) => {
                const activeSubscriptions = subscriptions.filter(sub => sub.status === 'active');
                return Object.assign({}, member, {
                    subscriptions: activeSubscriptions,
                    plans: activeSubscriptions.map(sub => sub.plan)
                });
            });
        });
    }

    function destroy(...args) {
        return getMember(...args).then((member) => {
            if (!member) {
                return null;
            }
            return subscriptions.getAdapters().then((adapters) => {
                return Promise.all(adapters.map((adapter) => {
                    return subscriptions.removeCustomer(member, {
                        adapter
                    });
                }));
            }).then(() => {
                return deleteMember(...args);
            });
        });
    }

    return {
        requestPasswordReset,
        resetPassword,
        create: createMember,
        validate: validateMember,
        list: listMembers,
        destroy,
        get
    };
};
