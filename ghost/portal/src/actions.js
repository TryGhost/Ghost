function createPopupNotification({type, status, autoHide, closeable, state}) {
    let count = 0;
    if (state.popupNotification) {
        count = (state.popupNotification.count || 0) + 1;
    }
    return {
        type,
        status,
        autoHide,
        closeable,
        count
    };
}

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
        popupNotification: null,
        page: state.page === 'magiclink' ? '' : state.page
    };
}

function openNotification({data}) {
    return {
        showNotification: true,
        ...data
    };
}

function closeNotification({state}) {
    return {
        showNotification: false
    };
}

async function signout({api}) {
    await api.member.signout();
    return {
        action: 'signout:success'
    };
}

async function signin({data, api}) {
    try {
        await api.member.sendMagicLink(data);
        return {
            page: 'magiclink'
        };
    } catch (e) {
        return {
            popupNotification: createPopupNotification({
                type: 'signin:failed',
                autoHide: false,
                closeable: true,
                status: 'error',
                meta: {
                    reason: e.message
                }
            })
        };
    }
}

async function signup({data, api}) {
    try {
        const {plan, email, name} = data;
        if (plan.toLowerCase() === 'free') {
            await api.member.sendMagicLink(data);
        } else {
            await api.member.checkoutPlan({plan, email, name});
        }
        return {
            page: 'magiclink'
        };
    } catch (e) {
        return {
            popupNotification: createPopupNotification({
                type: 'signup:failed',
                autoHide: false,
                closeable: true,
                status: 'error',
                meta: {
                    reason: e.message
                }
            })
        };
    }
}

async function updateEmail({data, api}) {
    try {
        await api.member.sendMagicLink(data);
        return {
            action: 'updateEmail:success'
        };
    } catch (e) {
        return {
            popupNotification: createPopupNotification({
                type: 'updateEmail:failed',
                autoHide: false,
                closeable: true,
                status: 'error',
                meta: {
                    reason: e.message
                }
            })
        };
    }
}

async function checkoutPlan({data, api}) {
    const {plan} = data;
    await api.member.checkoutPlan({
        plan
    });
}

async function updateSubscription({data, state, api}) {
    const {plan, subscriptionId, cancelAtPeriodEnd} = data;
    await api.member.updateSubscription({
        planName: plan, subscriptionId, cancelAtPeriodEnd
    });
    const member = await api.member.sessionData();
    const action = 'updateSubscription:success';
    return {
        action,
        popupNotification: createPopupNotification({
            type: action,
            autoHide: true,
            closeable: true,
            state
        }),
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

async function editBilling({data, api}) {
    await api.member.editBilling();
}

async function clearPopupNotification() {
    return {
        popupNotification: null
    };
}

async function updateNewsletter({data, state, api}) {
    const {subscribed} = data;
    const member = await api.member.update({subscribed});
    if (!member) {
        return {
            action: 'updateNewsletter:failed'
        };
    } else {
        const action = 'updateNewsletter:success';
        return {
            action,
            member: member,
            popupNotification: createPopupNotification({
                type: action,
                autoHide: true,
                closeable: true,
                state
            })
        };
    }
}

async function updateProfile({data, state, api}) {
    const {name, subscribed} = data;
    const member = await api.member.update({name, subscribed});
    if (!member) {
        const action = 'updateProfile:failed';
        return {
            action,
            popupNotification: createPopupNotification({
                type: action,
                autoHide: true,
                closeable: true,
                status: 'error',
                state
            })
        };
    } else {
        const action = 'updateProfile:success';
        return {
            action,
            member: member,
            page: 'accountHome',
            popupNotification: createPopupNotification({
                type: action,
                autoHide: true,
                closeable: true,
                status: 'success',
                state
            })
        };
    }
}

const Actions = {
    togglePopup,
    openPopup,
    closePopup,
    switchPage,
    openNotification,
    closeNotification,
    back,
    signout,
    signin,
    signup,
    updateEmail,
    updateSubscription,
    cancelSubscription,
    updateNewsletter,
    updateProfile,
    clearPopupNotification,
    editBilling,
    checkoutPlan
};

/** Handle actions in the App, returns updated state */
export default async function ActionHandler({action, data, state, api}) {
    const handler = Actions[action];
    if (handler) {
        return await handler({data, state, api}) || {};
    }
    return {};
}