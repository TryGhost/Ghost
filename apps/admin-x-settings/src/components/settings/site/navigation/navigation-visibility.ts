import {NAVIGATION_ITEM_VISIBILITY, type NavigationItemVisibility} from '../../../../hooks/site/use-navigation-editor';

export const navigationVisibilityLabels = {
    public: 'Everyone',
    members: 'Members only',
    paid: 'Paid-members only',
    public_free: 'Public + free',
    public_paid: 'Public + paid',
    public_only: 'Public only',
    free_members: 'Free only',
    none: 'Hidden'
} satisfies Record<NavigationItemVisibility, string>;

export const navigationVisibilityOptions = NAVIGATION_ITEM_VISIBILITY.map(value => ({
    value,
    label: navigationVisibilityLabels[value]
}));

export const visibilityAudienceOptions = [
    {key: 'public-visitors', label: 'Public visitors'},
    {key: 'free-members', label: 'Free members'},
    {key: 'paid-members', label: 'Paid members'}
] as const;

export type VisibilityAudience = typeof visibilityAudienceOptions[number]['key'];

export const visibilityAudienceMap = {
    public: {'public-visitors': true, 'free-members': true, 'paid-members': true},
    members: {'public-visitors': false, 'free-members': true, 'paid-members': true},
    paid: {'public-visitors': false, 'free-members': false, 'paid-members': true},
    public_free: {'public-visitors': true, 'free-members': true, 'paid-members': false},
    public_paid: {'public-visitors': true, 'free-members': false, 'paid-members': true},
    public_only: {'public-visitors': true, 'free-members': false, 'paid-members': false},
    free_members: {'public-visitors': false, 'free-members': true, 'paid-members': false},
    none: {'public-visitors': false, 'free-members': false, 'paid-members': false}
} satisfies Record<NavigationItemVisibility, Record<VisibilityAudience, boolean>>;

export const paidVisibilityValues: NavigationItemVisibility[] = ['paid', 'public_paid'];

type AudienceKey = '000' | '001' | '010' | '011' | '100' | '101' | '110' | '111';

const visibilityByAudienceKey = {
    '000': 'none',
    '001': 'paid',
    '010': 'free_members',
    '011': 'members',
    100: 'public_only',
    101: 'public_paid',
    110: 'public_free',
    111: 'public'
} satisfies Record<AudienceKey, NavigationItemVisibility>;

export const getNavigationVisibility = (visibility?: NavigationItemVisibility): NavigationItemVisibility => (
    navigationVisibilityOptions.some(option => option.value === visibility) ? visibility as NavigationItemVisibility : 'public'
);

export const getVisibilityLabel = (visibility: NavigationItemVisibility) => navigationVisibilityLabels[visibility];

export const getAudienceVisibility = (visibility: NavigationItemVisibility, showPaidVisibility: boolean) => ({
    ...visibilityAudienceMap[visibility],
    ...(!showPaidVisibility ? {'paid-members': false} : {})
});

export const getVisibilityFromAudiences = (audiences: Record<VisibilityAudience, boolean>): NavigationItemVisibility => {
    const key = [
        audiences['public-visitors'],
        audiences['free-members'],
        audiences['paid-members']
    ].map(value => (value ? '1' : '0')).join('') as AudienceKey;

    return visibilityByAudienceKey[key];
};
