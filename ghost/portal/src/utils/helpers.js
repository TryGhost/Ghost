export function getMemberSubscription({member = {}}) {
    if (member.paid) {
        const [subscription] = member.subscriptions || [];
        return subscription;
    }
    return null;
}

export function isMemberComplimentary({member = {}}) {
    const subscription = getMemberSubscription({member});
    if (subscription) {
        const {plan} = subscription;
        return (plan.nickname === 'Complimentary');
    }
    return false;
}