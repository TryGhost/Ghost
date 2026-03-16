import {buildDefaultVisibility} from '@tryghost/kg-default-nodes/visibility';

export const VISIBILITY_SETTINGS = {
    WEB_AND_EMAIL: 'web and email',
    WEB_ONLY: 'web only',
    EMAIL_ONLY: 'email only',
    NONE: 'none'
};

export interface Visibility {
    web: {
        nonMember: boolean;
        memberSegment: string;
    };
    email: {
        memberSegment: string;
    };
}

export interface VisibilityToggles {
    web: {
        nonMembers: boolean;
        freeMembers: boolean;
        paidMembers: boolean;
    };
    email: {
        freeMembers: boolean;
        paidMembers: boolean;
    };
}

interface Toggle {
    key: string;
    label: string;
    checked: boolean;
}

export interface VisibilityOption {
    label: string;
    key: string;
    toggles: Toggle[];
}

export function parseVisibilityToToggles(visibility?: Visibility): VisibilityToggles {
    visibility = visibility || buildDefaultVisibility();

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

function isToggleChecked(toggles: Toggle[], key: string, fallback: boolean): boolean {
    return toggles.find(t => t.key === key)?.checked ?? fallback;
}

// used for building UI
export function getVisibilityOptions(visibility: Visibility | undefined, {isStripeEnabled = true, showWeb = true, showEmail = true} = {}): VisibilityOption[] {
    visibility = visibility || buildDefaultVisibility();
    const toggles = parseVisibilityToToggles(visibility);

    // use arrays to ensure consistent order when using to build UI
    const options: VisibilityOption[] = [
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

    return options.filter((option) => {
        if (option.key === 'web') {
            return showWeb;
        }

        if (option.key === 'email') {
            return showEmail;
        }

        return true;
    });
}

export function serializeOptionsToVisibility(options: VisibilityOption[], existingVisibility?: Visibility) {
    existingVisibility = existingVisibility || buildDefaultVisibility();
    const existingToggles = parseVisibilityToToggles(existingVisibility);
    const webToggles = options.find(group => group.key === 'web')?.toggles ?? [];
    const emailToggles = options.find(group => group.key === 'email')?.toggles ?? [];

    const webSegments: string[] = [];
    if (isToggleChecked(webToggles, 'freeMembers', existingToggles.web.freeMembers)) {
        webSegments.push('status:free');
    }
    if (isToggleChecked(webToggles, 'paidMembers', existingToggles.web.paidMembers)) {
        webSegments.push('status:-free');
    }

    const emailSegments: string[] = [];
    if (isToggleChecked(emailToggles, 'freeMembers', existingToggles.email.freeMembers)) {
        emailSegments.push('status:free');
    }
    if (isToggleChecked(emailToggles, 'paidMembers', existingToggles.email.paidMembers)) {
        emailSegments.push('status:-free');
    }

    return {
        web: {
            nonMember: isToggleChecked(webToggles, 'nonMembers', existingToggles.web.nonMembers),
            memberSegment: webSegments.join(',')
        },
        email: {
            memberSegment: emailSegments.join(',')
        }
    };
}
