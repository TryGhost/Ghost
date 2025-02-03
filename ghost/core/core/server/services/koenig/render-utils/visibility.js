export const ALL_MEMBERS_SEGMENT = 'status:free,status:-free';
export const NO_MEMBERS_SEGMENT = '';

const DEFAULT_VISIBILITY = {
    web: {
        nonMember: true,
        memberSegment: 'status:free,status:-free'
    },
    email: {
        memberSegment: 'status:free,status:-free'
    }
};

// ensure we always work with a deep copy to avoid accidental constant mutations
export function buildDefaultVisibility() {
    return JSON.parse(JSON.stringify(DEFAULT_VISIBILITY));
}

export function usesOldVisibilityFormat(visibility) {
    return !Object.prototype.hasOwnProperty.call(visibility, 'web')
        || !Object.prototype.hasOwnProperty.call(visibility, 'email')
        || !Object.prototype.hasOwnProperty.call(visibility.web, 'nonMember');
}

export function migrateOldVisibilityFormat(visibility) {
    visibility.web ??= {};
    visibility.web.nonMember ??= visibility.showOnWeb;
    visibility.web.memberSegment ??= visibility.showOnWeb ? ALL_MEMBERS_SEGMENT : NO_MEMBERS_SEGMENT;

    visibility.email ??= {};
    if (visibility.showOnEmail) {
        visibility.email.memberSegment ??= visibility.segment ? visibility.segment : ALL_MEMBERS_SEGMENT;
    } else {
        visibility.email.memberSegment = NO_MEMBERS_SEGMENT;
    }
}
