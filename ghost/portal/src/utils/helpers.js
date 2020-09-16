import CalculateDiscount from './discount';

export function getMemberSubscription({member = {}}) {
    if (member.paid) {
        const [subscription] = member.subscriptions || [];
        return subscription;
    }
    return null;
}

export function isComplimentaryMember({member = {}}) {
    const subscription = getMemberSubscription({member});
    if (subscription) {
        const {plan} = subscription;
        return (plan.nickname === 'Complimentary');
    }
    return false;
}

export function isPaidMember({member = {}}) {
    return (member && member.paid);
}

export function getPlanFromSubscription({subscription}) {
    if (subscription && subscription.plan) {
        return {
            type: subscription.plan.interval,
            price: subscription.plan.amount / 100,
            currency: subscription.plan.currency_symbol,
            name: subscription.plan.nickname
        };
    }
    return null;
}

export function getMemberActivePlan({member}) {
    const subscription = getMemberSubscription({member});
    return getPlanFromSubscription({subscription});
}

export function getSubscriptionFromId({member, subscriptionId}) {
    if (member.paid) {
        const subscriptions = member.subscriptions || [];
        return subscriptions.find(d => d.id === subscriptionId);
    }
    return null;
}

export function hasOnlyFreePlan({site = {}}) {
    const plans = getSitePlans({site});
    return !plans || plans.length === 0 || (plans.length === 1 && plans[0].type === 'free');
}

export function getSitePlans({site = {}, includeFree = true}) {
    const {
        plans,
        allow_self_signup: allowSelfSignup,
        is_stripe_configured: isStripeConfigured,
        portal_plans: portalPlans
    } = site || {};

    if (!plans) {
        return [];
    }

    const plansData = [];
    const discount = CalculateDiscount(plans.monthly, plans.yearly);
    const stripePlans = [
        {
            type: 'month',
            price: plans.monthly,
            currency: plans.currency_symbol,
            name: 'Monthly'
        },
        {
            type: 'year',
            price: plans.yearly,
            currency: plans.currency_symbol,
            name: 'Yearly',
            discount
        }
    ];

    if (allowSelfSignup && portalPlans.includes('free') && includeFree) {
        plansData.push({
            type: 'free',
            price: 0,
            currency: plans.currency_symbol,
            name: 'Free'
        });
    }

    if (isStripeConfigured) {
        stripePlans.forEach((plan) => {
            if (portalPlans.includes(plan.name.toLowerCase())) {
                plansData.push(plan);
            }
        });
    }
    return plansData;
}
