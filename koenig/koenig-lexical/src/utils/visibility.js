import {utils} from '@tryghost/kg-default-nodes';

export function parseVisibilityToToggles(visibility) {
    return {
        web: {
            nonMembers: visibility.web.nonMember,
            freeMembers: visibility.web.memberSegment.indexOf('status:free') !== -1,
            paidMembers: visibility.web.memberSegment.indexOf('status:-free') !== -1
        },
        email: {
            freeMembers: visibility.email.memberSegment.indexOf('status:free') !== -1,
            paidMembers: visibility.email.memberSegment.indexOf('status:-free') !== -1
        }
    };
}

export function serializeTogglesToVisibility(toggles) {
    const webSegments = [];
    if (toggles.web.freeMembers) {
        webSegments.push('status:free');
    }
    if (toggles.web.paidMembers) {
        webSegments.push('status:-free');
    }

    const emailSegments = [];
    if (toggles.email.freeMembers) {
        emailSegments.push('status:free');
    }
    if (toggles.email.paidMembers) {
        emailSegments.push('status:-free');
    }

    return {
        web: {
            nonMember: toggles.web.nonMembers,
            memberSegment: webSegments.join(',')
        },
        email: {
            memberSegment: emailSegments.join(',')
        }
    };
}

// used for building UI
export function getVisibilityOptions(visibility, {isStripeEnabled = true} = {}) {
    visibility = visibility || utils.visibility.buildDefaultVisibility();
    const toggles = parseVisibilityToToggles(visibility);

    // use arrays to ensure consistent order when using to build UI
    const options = [
        {
            label: 'Web',
            key: 'web',
            toggles: [
                {key: 'nonMembers', label: 'Public visitors', checked: toggles.web.nonMembers},
                {key: 'freeMembers', label: 'Free members', checked: toggles.web.freeMembers},
                {key: 'paidMembers', label: 'Paid members', checked: toggles.web.paidMembers}
            ]
        },
        {
            label: 'Email',
            key: 'email',
            toggles: [
                {key: 'freeMembers', label: 'Free members', checked: toggles.email.freeMembers},
                {key: 'paidMembers', label: 'Paid members', checked: toggles.email.paidMembers}
            ]
        }
    ];

    if (!isStripeEnabled) {
        options[0].toggles = options[0].toggles.filter(t => t.key !== 'paidMembers');
        options[1].toggles = options[1].toggles.filter(t => t.key !== 'paidMembers');
    }

    return options;
}

export function serializeOptionsToVisibility(options) {
    const webToggles = options.find(group => group.key === 'web').toggles;
    const webSegments = [];
    if (webToggles.find(t => t.key === 'freeMembers')?.checked) {
        webSegments.push('status:free');
    }
    if (webToggles.find(t => t.key === 'paidMembers')?.checked) {
        webSegments.push('status:-free');
    }

    const emailToggles = options.find(group => group.key === 'email').toggles;
    const emailSegments = [];
    if (emailToggles.find(t => t.key === 'freeMembers')?.checked) {
        emailSegments.push('status:free');
    }
    if (emailToggles.find(t => t.key === 'paidMembers')?.checked) {
        emailSegments.push('status:-free');
    }

    return {
        web: {
            nonMember: webToggles.find(t => t.key === 'nonMembers')?.checked || false,
            memberSegment: webSegments.join(',')
        },
        email: {
            memberSegment: emailSegments.join(',')
        }
    };
}
