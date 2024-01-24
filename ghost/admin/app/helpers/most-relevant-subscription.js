import moment from 'moment-timezone';
import {helper} from '@ember/component/helper';

export function mostRelevantSubscription(subs) {
    // Ignore comped subscriptions (without id)
    const items = [...(subs || []).filter(sub => !!sub.id)];

    // Find active subscription if any, then sort by latest current_period_end if needed
    items.sort((a, b) => {
        const isActiveA = ['active', 'trialing', 'unpaid', 'past_due'].includes(a.status);
        const isActiveB = ['active', 'trialing', 'unpaid', 'past_due'].includes(b.status);

        // Sort by status, active first
        if (isActiveA && !isActiveB) {
            return -1;
        } else if (!isActiveA && isActiveB) {
            return 1;
        }

        // Sort by current_period_end, latest first
        const endDateA = moment(a.current_period_end);
        const endDateB = moment(b.current_period_end);

        if (!endDateA.isValid()) {
            return 1;
        } else if (!endDateB.isValid()) {
            return -1;
        }

        return endDateB.valueOf() - endDateA.valueOf();
    });

    return items[0] || null;
}

export default helper(function ([items = []]) {
    return mostRelevantSubscription(items);
});

