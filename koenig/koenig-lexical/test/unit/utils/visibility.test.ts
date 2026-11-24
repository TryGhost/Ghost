import {expect} from 'vitest';
import {
    getVisibilityOptions,
    isSameVisibility,
    parseVisibilityToToggles,
    serializeOptionsToVisibility
} from '../../../src/utils/visibility';
import type {Visibility} from '@tryghost/kg-default-nodes/visibility';

describe('parseVisibilityToToggles', function () {
    it('should return correct truthy toggles based on the visibility object', function () {
        const visibility = {
            web: {
                nonMember: true,
                memberSegment: 'status:free,status:-free'
            },
            email: {
                memberSegment: 'status:free,status:-free'
            }
        };

        const result = parseVisibilityToToggles(visibility);

        expect(result).toEqual({
            web: {
                nonMembers: true,
                freeMembers: true,
                paidMembers: true
            },
            email: {
                freeMembers: true,
                paidMembers: true
            }
        });
    });

    it('should return correct falsy toggles based on the visibility object', function () {
        const visibility = {
            web: {
                nonMember: false,
                memberSegment: ''
            },
            email: {
                memberSegment: ''
            }
        };

        const result = parseVisibilityToToggles(visibility);

        expect(result).toEqual({
            web: {
                nonMembers: false,
                freeMembers: false,
                paidMembers: false
            },
            email: {
                freeMembers: false,
                paidMembers: false
            }
        });
    });

    it('handles partial member segments', function () {
        const visibility = {
            web: {
                nonMember: false,
                memberSegment: 'status:free'
            },
            email: {
                memberSegment: 'status:-free'
            }
        };

        const result = parseVisibilityToToggles(visibility);

        expect(result).toEqual({
            web: {
                nonMembers: false,
                freeMembers: true,
                paidMembers: false
            },
            email: {
                freeMembers: false,
                paidMembers: true
            }
        });
    });
});

describe('getVisibilityOptions', function () {
    it('has correct default options', function () {
        const options = getVisibilityOptions();

        expect(options).toEqual([
            {
                label: 'Web',
                key: 'web',
                toggles: [
                    {key: 'nonMembers', label: 'Public visitors', checked: true},
                    {key: 'freeMembers', label: 'Free members', checked: true},
                    {key: 'paidMembers', label: 'Paid members', checked: true}
                ]
            },
            {
                label: 'Email',
                key: 'email',
                toggles: [
                    {key: 'freeMembers', label: 'Free members', checked: true},
                    {key: 'paidMembers', label: 'Paid members', checked: true}
                ]
            }
        ]);
    });

    it('removes paid options if stripe is disabled', function () {
        const options = getVisibilityOptions(undefined, {isStripeEnabled: false});

        expect(options).toEqual([
            {
                label: 'Web',
                key: 'web',
                toggles: [
                    {key: 'nonMembers', label: 'Public visitors', checked: true},
                    {key: 'freeMembers', label: 'Free members', checked: true}
                ]
            },
            {
                label: 'Email',
                key: 'email',
                toggles: [
                    {key: 'freeMembers', label: 'Free members', checked: true}
                ]
            }
        ]);
    });

    it('updates option checked values based on visibility', function () {
        const visibility = {
            web: {
                nonMember: false,
                memberSegment: 'status:free'
            },
            email: {
                memberSegment: 'status:-free'
            }
        };

        const options = getVisibilityOptions(visibility);

        expect(options).toEqual([
            {
                label: 'Web',
                key: 'web',
                toggles: [
                    {key: 'nonMembers', label: 'Public visitors', checked: false},
                    {key: 'freeMembers', label: 'Free members', checked: true},
                    {key: 'paidMembers', label: 'Paid members', checked: false}
                ]
            },
            {
                label: 'Email',
                key: 'email',
                toggles: [
                    {key: 'freeMembers', label: 'Free members', checked: false},
                    {key: 'paidMembers', label: 'Paid members', checked: true}
                ]
            }
        ]);
    });

    it('returns only web group when showEmail is false', function () {
        const options = getVisibilityOptions(undefined, {showEmail: false});

        expect(options).toEqual([
            {
                label: 'Web',
                key: 'web',
                toggles: [
                    {key: 'nonMembers', label: 'Public visitors', checked: true},
                    {key: 'freeMembers', label: 'Free members', checked: true},
                    {key: 'paidMembers', label: 'Paid members', checked: true}
                ]
            }
        ]);
    });

    it('returns only email group when showWeb is false', function () {
        const options = getVisibilityOptions(undefined, {showWeb: false});

        expect(options).toEqual([
            {
                label: 'Email',
                key: 'email',
                toggles: [
                    {key: 'freeMembers', label: 'Free members', checked: true},
                    {key: 'paidMembers', label: 'Paid members', checked: true}
                ]
            }
        ]);
    });
});

describe('serializeOptionsToVisibility', function () {
    it('preserves hidden group visibility values', function () {
        const existingVisibility = {
            web: {
                nonMember: false,
                memberSegment: 'status:free,status:-free'
            },
            email: {
                memberSegment: 'status:free'
            }
        };

        const visibility = serializeOptionsToVisibility([
            {
                label: 'Web',
                key: 'web',
                toggles: [
                    {key: 'nonMembers', label: 'Public visitors', checked: true},
                    {key: 'freeMembers', label: 'Free members', checked: false},
                    {key: 'paidMembers', label: 'Paid members', checked: true}
                ]
            }
        ], existingVisibility);

        expect(visibility).toEqual({
            web: {
                nonMember: true,
                memberSegment: 'status:-free'
            },
            email: {
                memberSegment: 'status:free'
            }
        });
    });

    it('serializes all groups when both are present in options', function () {
        const visibility = serializeOptionsToVisibility([
            {
                key: 'web',
                label: 'Web',
                toggles: [
                    {key: 'nonMembers', label: 'Public visitors', checked: true},
                    {key: 'freeMembers', label: 'Free members', checked: true},
                    {key: 'paidMembers', label: 'Paid members', checked: false}
                ]
            },
            {
                key: 'email',
                label: 'Email',
                toggles: [
                    {key: 'freeMembers', label: 'Free members', checked: false},
                    {key: 'paidMembers', label: 'Paid members', checked: true}
                ]
            }
        ]);

        expect(visibility).toEqual({
            web: {
                nonMember: true,
                memberSegment: 'status:free'
            },
            email: {
                memberSegment: 'status:-free'
            }
        });
    });
});

describe('isSameVisibility', function () {
    const paidOnly = {web: {nonMember: false, memberSegment: 'status:-free'}, email: {memberSegment: 'status:-free'}};
    const freeOnly = {web: {nonMember: false, memberSegment: 'status:free'}, email: {memberSegment: 'status:free'}};
    const everyone = {web: {nonMember: true, memberSegment: 'status:free,status:-free'}, email: {memberSegment: 'status:free,status:-free'}};

    it('matches identical audiences', function () {
        expect(isSameVisibility(paidOnly, {...paidOnly})).toBe(true);
    });

    it('treats missing visibility as everyone', function () {
        expect(isSameVisibility(undefined, everyone)).toBe(true);
        expect(isSameVisibility(undefined, undefined)).toBe(true);
        expect(isSameVisibility(undefined, paidOnly)).toBe(false);
    });

    // the renderer hides a card on the web when it doesn't recognise the web segment
    it('does not treat an unrecognised web segment as everyone', function () {
        const reordered = {...everyone, web: {nonMember: true, memberSegment: 'status:-free,status:free'}};
        const hiddenOnWeb = {...everyone, web: {nonMember: false, memberSegment: ''}};

        expect(isSameVisibility(reordered, everyone)).toBe(false);
        expect(isSameVisibility(reordered, hiddenOnWeb)).toBe(true);
    });

    it('does not match different audiences', function () {
        expect(isSameVisibility(paidOnly, freeOnly)).toBe(false);
        expect(isSameVisibility(paidOnly, everyone)).toBe(false);
    });

    it('does not match when only the email audience differs', function () {
        const paidWebFreeEmail = {...paidOnly, email: {memberSegment: 'status:free'}};
        expect(isSameVisibility(paidOnly, paidWebFreeEmail)).toBe(false);
    });

    it('compares legacy visibility after migrating it', function () {
        expect(isSameVisibility({showOnWeb: true, showOnEmail: true, segment: ''}, everyone)).toBe(true);
    });

    // the renderer only shows a card to public visitors when nonMember is exactly true
    it('does not treat a nonMember value other than true as public', function () {
        // stored data the editor doesn't produce itself
        const nullNonMember = {...everyone, web: {...everyone.web, nonMember: null}} as unknown as Visibility;
        const stringNonMember = {...everyone, web: {...everyone.web, nonMember: 'true'}} as unknown as Visibility;
        const membersOnly = {...everyone, web: {...everyone.web, nonMember: false}};

        expect(isSameVisibility(nullNonMember, everyone)).toBe(false);
        expect(isSameVisibility(stringNonMember, everyone)).toBe(false);
        expect(isSameVisibility(nullNonMember, membersOnly)).toBe(true);
    });
});
