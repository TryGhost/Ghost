export const handleAuthActions = ({qsParams, action, status}) => {
    if (status && ['true', 'false'].includes(status)) {
        const successStatus = JSON.parse(status);
        return {
            type: action,
            status: successStatus ? 'success' : 'error',
            duration: 3000,
            autoHide: successStatus ? true : false
        };
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

    if (billingOnly && ['billing-update-success', 'billing-update-cancel'].includes(status)) {
        const statusVal = status === 'billing-update-success' ? 'success' : 'warning';
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
    const qs = window.location.search || '';
    const qsParams = new URLSearchParams(qs);
    paramsToClear.forEach((param) => {
        qsParams.delete(param);
    });
    const newParams = qsParams.toString() ? `?${qsParams}` : '';
    window.history.replaceState({}, '', `${window.location.pathname}${newParams}`);
};

/** Handle actions in the App, returns updated state */
export default function NotificationParser({billingOnly = false} = {}) {
    const qs = window.location.search;
    if (!qs) {
        return null;
    }
    const qsParams = new URLSearchParams(qs);
    const action = qsParams.get('action');
    const successStatus = qsParams.get('success');
    const stripeStatus = qsParams.get('stripe');
    let notificationData = null;

    if (stripeStatus) {
        return handleStripeActions({qsParams, status: stripeStatus, billingOnly});
    }

    if (action && successStatus && !billingOnly) {
        return handleAuthActions({qsParams, action, status: successStatus});
    }

    return notificationData;
}