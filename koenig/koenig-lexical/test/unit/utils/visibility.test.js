import {expect} from 'vitest';
import {
    getVisibilityOptions,
    parseVisibilityToToggles
} from '../../../src/utils/visibility';

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
                    {key: 'nonMembers', label: 'Anonymous visitors', checked: true},
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
                    {key: 'nonMembers', label: 'Anonymous visitors', checked: true},
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
                    {key: 'nonMembers', label: 'Anonymous visitors', checked: false},
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
});
