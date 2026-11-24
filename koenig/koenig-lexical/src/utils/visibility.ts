import {$isGalleryNode, $isImageNode, $isKoenigCard} from '@tryghost/kg-default-nodes';
import {ALL_MEMBERS_SEGMENT, FREE_MEMBERS_SEGMENT, NO_MEMBERS_SEGMENT, PAID_MEMBERS_SEGMENT, buildDefaultVisibility, getRenderedVisibility} from '@tryghost/kg-default-nodes/visibility';
import type {CardConfig} from '../context/KoenigComposerContext';
import type {KoenigCard} from '@tryghost/kg-default-nodes';
import type {LexicalNode} from 'lexical';
import type {MemberSegment, RenderedVisibility, Visibility} from '@tryghost/kg-default-nodes/visibility';

export const VISIBILITY_SETTINGS = {
    WEB_AND_EMAIL: 'web and email',
    WEB_ONLY: 'web only',
    EMAIL_ONLY: 'email only',
    NONE: 'none'
} as const;

export type VisibilitySetting = typeof VISIBILITY_SETTINGS[keyof typeof VISIBILITY_SETTINGS];

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

export type VisibilityGroupKey = 'web' | 'email';

export type VisibilityToggleKey = 'nonMembers' | 'freeMembers' | 'paidMembers';

export interface VisibilityToggle {
    key: VisibilityToggleKey;
    label: string;
    checked: boolean;
}

export interface VisibilityOption {
    label: string;
    key: VisibilityGroupKey;
    toggles: VisibilityToggle[];
}

export type ToggleVisibility = (groupKey: VisibilityGroupKey, toggleKey: VisibilityToggleKey, value: boolean) => void;

export function isVisibilityEnabled(cardConfig?: CardConfig) {
    return (cardConfig?.visibilitySettings ?? VISIBILITY_SETTINGS.WEB_AND_EMAIL) !== VISIBILITY_SETTINGS.NONE;
}

// Whether the editor should offer visibility settings for a card type.
// `cardConfig.visibilityCardTypes` lists the cards whose visibility the
// backend can honour; Admin passes it because it can deploy ahead of the
// server. Without a list every card with a visibility property is allowed.
export function isCardVisibilityAvailable(cardType: string, cardConfig?: CardConfig) {
    if (!isVisibilityEnabled(cardConfig)) {
        return false;
    }

    const supportedTypes = cardConfig?.visibilityCardTypes;
    return !Array.isArray(supportedTypes) || supportedTypes.includes(cardType);
}

// an image or gallery placeholder has no content to hide yet
function isPlaceholderCard(cardNode: KoenigCard) {
    return ($isImageNode(cardNode) && cardNode.src === '')
        || ($isGalleryNode(cardNode) && cardNode.images.length === 0);
}

// Cards without an edit mode of their own (image, gallery) still open
// their settings panel in edit mode when visibility is something to edit
export function cardHasEditMode(cardNode: LexicalNode | null | undefined, cardConfig?: CardConfig) {
    if (!$isKoenigCard(cardNode)) {
        return false;
    }

    if (cardNode.hasEditMode()) {
        return true;
    }

    return cardNode.hasVisibility?.() === true && isCardVisibilityAvailable(cardNode.getType(), cardConfig) && !isPlaceholderCard(cardNode);
}

export function parseVisibilityToToggles(visibility?: RenderedVisibility): VisibilityToggles {
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

function isToggleChecked(toggles: VisibilityToggle[], key: VisibilityToggleKey, fallback: boolean): boolean {
    return toggles.find(t => t.key === key)?.checked ?? fallback;
}

// used for building UI
export function getVisibilityOptions(visibility?: RenderedVisibility, {isStripeEnabled = true, showWeb = true, showEmail = true} = {}): VisibilityOption[] {
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

function getMemberSegment(freeMembers: boolean, paidMembers: boolean): MemberSegment {
    if (freeMembers && paidMembers) {
        return ALL_MEMBERS_SEGMENT;
    }
    if (freeMembers) {
        return FREE_MEMBERS_SEGMENT;
    }
    if (paidMembers) {
        return PAID_MEMBERS_SEGMENT;
    }
    return NO_MEMBERS_SEGMENT;
}

export function serializeOptionsToVisibility(options: VisibilityOption[], existingVisibility?: RenderedVisibility): RenderedVisibility {
    existingVisibility = existingVisibility || buildDefaultVisibility();
    const existingToggles = parseVisibilityToToggles(existingVisibility);
    const webToggles = options.find(group => group.key === 'web')?.toggles ?? [];
    const emailToggles = options.find(group => group.key === 'email')?.toggles ?? [];

    return {
        web: {
            nonMember: isToggleChecked(webToggles, 'nonMembers', existingToggles.web.nonMembers),
            memberSegment: getMemberSegment(
                isToggleChecked(webToggles, 'freeMembers', existingToggles.web.freeMembers),
                isToggleChecked(webToggles, 'paidMembers', existingToggles.web.paidMembers)
            )
        },
        email: {
            memberSegment: getMemberSegment(
                isToggleChecked(emailToggles, 'freeMembers', existingToggles.email.freeMembers),
                isToggleChecked(emailToggles, 'paidMembers', existingToggles.email.paidMembers)
            )
        }
    };
}

// Whether two cards show to exactly the same audiences. Missing visibility
// counts as the default (everyone), so a plain image matches a plain gallery.
// Used to stop drag-and-drop merging images with different audiences, which
// would otherwise silently widen who can see one of them.
export function isSameVisibility(a: Visibility | undefined, b: Visibility | undefined) {
    const x = getRenderedVisibility(a);
    const y = getRenderedVisibility(b);
    return x.web.nonMember === y.web.nonMember
        && x.web.memberSegment === y.web.memberSegment
        && x.email.memberSegment === y.email.memberSegment;
}
