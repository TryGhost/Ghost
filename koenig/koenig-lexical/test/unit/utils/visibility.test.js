import {expect} from 'vitest';
import {
    generateVisibilityMessageAlpha,
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

describe('generateVisibilityMessageAlpha', function () {
    it('should return correct message for all web and email', function () {
        const visibility = {
            web: {
                nonMember: true,
                memberSegment: 'status:free,status:-free'
            },
            email: {
                memberSegment: 'status:free,status:-free'
            }
        };

        const result = generateVisibilityMessageAlpha(visibility);

        expect(result).toBe('Visible to all web and email');
    });

    it('should return correct message for no web or email', function () {
        const visibility = {
            web: {
                nonMember: false,
                memberSegment: ''
            },
            email: {
                memberSegment: ''
            }
        };

        const result = generateVisibilityMessageAlpha(visibility);

        expect(result).toBe('Not visible on web or email');
    });

    it('should return correct message for all web visitors', function () {
        const visibility = {
            web: {
                nonMember: true,
                memberSegment: 'status:free,status:-free'
            },
            email: {
                memberSegment: ''
            }
        };

        const result = generateVisibilityMessageAlpha(visibility);

        expect(result).toBe('Visible to all web');
    });

    it('should return correct message for anonymous and free web visitors', function () {
        const visibility = {
            web: {
                nonMember: true,
                memberSegment: 'status:free'
            },
            email: {
                memberSegment: ''
            }
        };

        const result = generateVisibilityMessageAlpha(visibility);

        expect(result).toBe('Visible to anonymous and free web');
    });

    it('should return correct message for logged-in web visitors', function () {
        const visibility = {
            web: {
                nonMember: false,
                memberSegment: 'status:free,status:-free'
            },
            email: {
                memberSegment: ''
            }
        };

        const result = generateVisibilityMessageAlpha(visibility);

        expect(result).toBe('Visible to logged in web');
    });

    it('should return correct message for free web visitors', function () {
        const visibility = {
            web: {
                nonMember: false,
                memberSegment: 'status:free'
            },
            email: {
                memberSegment: ''
            }
        };

        const result = generateVisibilityMessageAlpha(visibility);

        expect(result).toBe('Visible to free web');
    });

    it('should return correct message for email-only', function () {
        const visibility = {
            web: {
                nonMember: false,
                memberSegment: ''
            },
            email: {
                memberSegment: 'status:free,status:-free'
            }
        };

        const result = generateVisibilityMessageAlpha(visibility);

        expect(result).toBe('Visible to all email recipients');
    });

    it('should return correct message for free email recipients', function () {
        const visibility = {
            web: {
                nonMember: false,
                memberSegment: ''
            },
            email: {
                memberSegment: 'status:free'
            }
        };

        const result = generateVisibilityMessageAlpha(visibility);

        expect(result).toBe('Visible to free email');
    });

    it('should return correct message for all web and free email', function () {
        const visibility = {
            web: {
                nonMember: true,
                memberSegment: 'status:free,status:-free'
            },
            email: {
                memberSegment: 'status:free'
            }
        };

        const result = generateVisibilityMessageAlpha(visibility);

        expect(result).toBe('Visible to all web, free email');
    });

    it('should return correct message for web members and all email', function () {
        const visibility = {
            web: {
                nonMember: false,
                memberSegment: 'status:free,status:-free'
            },
            email: {
                memberSegment: 'status:free,status:-free'
            }
        };

        const result = generateVisibilityMessageAlpha(visibility);

        expect(result).toBe('Visible to logged in web, all email recipients');
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
