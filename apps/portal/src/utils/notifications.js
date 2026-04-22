const getHashData = () => {
    const hash = window.location.hash || '';
    const [hashPath = '', hashQueryString = ''] = hash.replace(/^#/, '').split('?');

    return {
        hashPath,
        hashParams: new URLSearchParams(hashQueryString)
    };
};

const getURLParam = ({searchParams, hashParams}, name) => {
    return searchParams.get(name) ?? hashParams.get(name);
};

export const handleGiftRedemptionAction = ({status}) => {
    const successStatus = JSON.parse(status);

    return {
        type: 'giftRedeem',
        status: successStatus ? 'success' : 'error',
        duration: successStatus ? 5000 : 3000,
        autoHide: successStatus,
        ...(successStatus ? {
            message: 'Gift redeemed! You\'re all set.' // TODO: Add translation strings once copy has been finalised
        } : {})
    };
};

export const handleAuthActions = ({action, status}) => {
    if (status && ['true', 'false'].includes(status)) {
        const successStatus = JSON.parse(status);
        const notification = {
            type: action,
            status: successStatus ? 'success' : 'error',
            duration: 3000,
            autoHide: successStatus ? true : false
        };

        return notification;
    }
    return {};
};

export const handleStripeActions = ({status, billingOnly}) => {
    if (!billingOnly && ['success'].includes(status)) {
        const statusVal = ['success'].includes(status) ? 'success' : 'warning';
        return {
            type: 'stripe:checkout',
            status: statusVal,
            duration: 3000,
            autoHide: true
        };
    }

    if (billingOnly && ['billing-portal-closed', 'billing-update-success', 'billing-update-cancel'].includes(status)) {
        const statusVal = status === 'billing-update-cancel' ? 'warning' : 'success';
        return {
            type: 'stripe:billing-update',
            status: statusVal,
            duration: 3000,
            autoHide: true,
            closeable: true
        };
    }
};

export const clearURLParams = (paramsToClear = []) => {
    const qsParams = new URLSearchParams(window.location.search || '');
    const {hashPath, hashParams} = getHashData();

    paramsToClear.forEach((param) => {
        qsParams.delete(param);
        hashParams.delete(param);
    });

    const newParams = qsParams.toString() ? `?${qsParams}` : '';
    const newHashQuery = hashParams.toString();
    const newHash = hashPath
        ? `#${hashPath}${newHashQuery ? `?${newHashQuery}` : ''}`
        : '';

    window.history.replaceState({}, '', `${window.location.pathname}${newParams}${newHash}`);
};

/** Handle actions in the App, returns updated state */
export default function NotificationParser({billingOnly = false} = {}) {
    const searchParams = new URLSearchParams(window.location.search || '');
    const {hashParams} = getHashData();
    const action = getURLParam({searchParams, hashParams}, 'action');
    const successStatus = getURLParam({searchParams, hashParams}, 'success');
    const stripeStatus = getURLParam({searchParams, hashParams}, 'stripe');
    const giftRedemption = getURLParam({searchParams, hashParams}, 'giftRedemption') === 'true';
    let notificationData = null;

    if (!action && !successStatus && !stripeStatus && !giftRedemption) {
        return null;
    }

    if (stripeStatus) {
        return handleStripeActions({status: stripeStatus, billingOnly});
    }

    if ((giftRedemption || action === 'giftRedeem') && successStatus && !billingOnly) {
        return handleGiftRedemptionAction({status: successStatus});
    }

    if (action && successStatus && !billingOnly) {
        return handleAuthActions({action, status: successStatus});
    }

    return notificationData;
}
