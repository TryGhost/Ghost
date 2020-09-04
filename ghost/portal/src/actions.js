function switchPage({data}) {
    return {
        page: data.page,
        lastPage: data.lastPage || null
    };
}

function togglePopup({state}) {
    return {
        showPopup: !state.showPopup
    };
}

function openPopup({data}) {
    return {
        showPopup: true,
        page: data.page
    };
}

function back({state}) {
    if (state.lastPage) {
        return {
            page: state.lastPage
        };
    } else {
        return closePopup({state});
    }
}

function closePopup({state}) {
    return {
        showPopup: false,
        lastPage: null,
        page: state.page === 'magiclink' ? '' : state.page
    };
}

async function signout({api}) {
    await api.member.signout();
    return {
        action: 'signout:success'
    };
}

async function signin({data, api}) {
    await api.member.sendMagicLink(data);
    return {
        page: 'magiclink'
    };
}

async function signup({data, api}) {
    const {plan, email, name} = data;
    if (plan.toLowerCase() === 'free') {
        await api.member.sendMagicLink(data);
    } else {
        await api.member.checkoutPlan({plan, email, name});
    }
    return {
        page: 'magiclink'
    };
}

async function updateEmail({data, api}) {
    await api.member.sendMagicLink(data);
    return {
        action: 'updateEmail:success'
    };
}

async function checkoutPlan({data, api}) {
    const {plan} = data;
    await api.member.checkoutPlan({
        plan
    });
}

async function updateSubscription({data, api}) {
    const {plan, subscriptionId, cancelAtPeriodEnd} = data;
    await api.member.updateSubscription({
        planName: plan, subscriptionId, cancelAtPeriodEnd
    });
    const member = await api.member.sessionData();
    return {
        action: 'updateSubscription:success',
        page: 'accountHome',
        member: member
    };
}

async function cancelSubscription({data, api}) {
    const {subscriptionId, cancelAtPeriodEnd} = data;
    await api.member.updateSubscription({
        subscriptionId, cancelAtPeriodEnd
    });
    const member = await api.member.sessionData();
    return {
        action: 'cancelSubscription:success',
        page: 'accountHome',
        member: member
    };
}

async function editBilling({data, updateState, state, api}) {
    await api.member.editBilling();
}

async function updateMember({data, updateState, state, api}) {
    const {name, subscribed} = data;
    const member = await api.member.update({name, subscribed});
    if (!member) {
        return {
            action: 'updateMember:failed'
        };
    } else {
        return {
            action: 'updateMember:success',
            member: member
        };
    }
}

async function updateProfile({data, updateState, state, api}) {
    const {name, subscribed} = data;
    const member = await api.member.update({name, subscribed});
    if (!member) {
        return {
            action: 'updateProfile:failed'
        };
    } else {
        return {
            action: 'updateProfile:success',
            member: member,
            page: 'accountHome'
        };
    }
}

const Actions = {
    togglePopup,
    openPopup,
    closePopup,
    switchPage,
    back,
    signout,
    signin,
    signup,
    updateEmail,
    updateSubscription,
    cancelSubscription,
    updateMember,
    updateProfile,
    editBilling,
    checkoutPlan
};

/** Handle actions in the App, returns updated state */
export default async function ActionHandler({action, data, updateState, state, api}) {
    const handler = Actions[action];
    if (handler) {
        return await handler({data, updateState, state, api}) || {};
    }
    return {};
}