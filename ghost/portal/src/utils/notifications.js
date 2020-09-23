export const handleAuthActions = ({action, status}) => {
    if (status && ['true', 'false'].includes(status)) {
        const successStatus = JSON.parse(status);
        return {
            type: action,
            status: successStatus ? 'success' : 'error',
            duration: 2000,
            autoHide: successStatus ? true : false
        };
    }
    return {};
};

export const handleStripeActions = ({status}) => {
    if (['cancel', 'success'].includes(status)) {
        const statusVal = status === 'success' ? 'success' : 'warning';
        return {
            type: 'stripe:checkout',
            status: statusVal,
            duration: 2000,
            autoHide: true
        };
    } else if (['billing-update-success', 'billing-update-cancel'].includes(status)) {
        const statusVal = status === 'billing-update-success' ? 'success' : 'warning';
        return {
            type: 'stripe:billing-update',
            status: statusVal,
            duration: 2000,
            autoHide: true
        };
    }
};

export const clearURLParams = (qsParams, paramsToClear = []) => {
    paramsToClear.forEach((param) => {
        qsParams.delete(param);
    });
    const newParams = qsParams.toString() ? `?${qsParams}` : '';
    window.history.replaceState({}, '', `${window.location.pathname}${newParams}`);
};

/** Handle actions in the App, returns updated state */
export default function NotificationParser() {
    const qs = window.location.search;
    if (!qs) {
        return null;
    }
    const qsParams = new URLSearchParams(qs);
    const action = qsParams.get('action');
    const successStatus = qsParams.get('success');
    const stripeStatus = qsParams.get('stripe');
    let notificationData = null;
    if (action && successStatus) {
        return handleAuthActions({action, status: successStatus});
    } else if (stripeStatus) {
        return handleStripeActions({status: stripeStatus});
    }

    return notificationData;
}