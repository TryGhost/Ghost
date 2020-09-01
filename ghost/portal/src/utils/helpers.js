export function getMemberSubscription({member = {}}) {
    if (member.paid) {
        const [subscription] = member.subscriptions || [];
        return subscription;
    }
    return null;
}