import ActionHandler from '../src/actions';
import {vi} from 'vitest';

describe('updateProfile action', () => {
    test('trims whitespace from name before saving', async () => {
        const mockApi = {
            member: {
                update: vi.fn(() => Promise.resolve({name: 'John Doe', email: 'john@example.com'}))
            }
        };
        const state = {
            member: {name: 'Old Name', email: 'john@example.com'}
        };

        await ActionHandler({
            action: 'updateProfile',
            data: {name: '  John Doe  ', email: 'john@example.com'},
            state,
            api: mockApi
        });

        expect(mockApi.member.update).toHaveBeenCalledWith({name: 'John Doe'});
    });
});

describe('signup action', () => {
    test('trims whitespace from name', async () => {
        const mockApi = {
            member: {
                getIntegrityToken: vi.fn(() => Promise.resolve('token-123')),
                sendMagicLink: vi.fn(() => Promise.resolve())
            }
        };
        const state = {site: {}};

        await ActionHandler({
            action: 'signup',
            data: {plan: 'free', email: 'john@example.com', name: '  John Doe  '},
            state,
            api: mockApi
        });

        expect(mockApi.member.sendMagicLink).toHaveBeenCalledWith(
            expect.objectContaining({name: 'John Doe'})
        );
    });
});

describe('startSigninOTCFromCustomForm action', () => {
    test('opens magic link popup with otcRef', async () => {
        const state = {
            pageData: {existing: 'data'}
        };
        const result = await ActionHandler({
            action: 'startSigninOTCFromCustomForm',
            data: {
                email: ' test@example.com ',
                otcRef: 'ref-123'
            },
            state,
            api: {}
        });

        expect(result).toMatchObject({
            showPopup: true,
            page: 'magiclink',
            lastPage: 'signin',
            otcRef: 'ref-123',
            pageData: {
                existing: 'data',
                email: 'test@example.com'
            },
            popupNotification: null
        });
    });

    test('returns empty object when otcRef missing', async () => {
        const result = await ActionHandler({
            action: 'startSigninOTCFromCustomForm',
            data: {
                email: 'test@example.com'
            },
            state: {},
            api: {}
        });

        expect(result).toEqual({});
    });
});

describe('verifyOTC action', () => {
    let originalLocation;
    let mockLocationAssign;

    beforeEach(() => {
        mockLocationAssign = vi.fn();
        originalLocation = window.location;
        delete window.location;
        window.location = {...originalLocation, assign: mockLocationAssign};
    });

    afterEach(() => {
        window.location = originalLocation;
    });

    test('redirects on successful verification', async () => {
        const mockApi = {
            member: {
                getIntegrityToken: vi.fn(() => Promise.resolve('token-123')),
                verifyOTC: vi.fn(() => Promise.resolve({
                    redirectUrl: 'https://example.com/success'
                }))
            }
        };

        await ActionHandler({
            action: 'verifyOTC',
            data: {otc: '123456', otcRef: 'ref-123'},
            api: mockApi
        });

        expect(mockLocationAssign).toHaveBeenCalledWith('https://example.com/success');
        expect(mockApi.member.verifyOTC).toHaveBeenCalledWith({
            otc: '123456',
            otcRef: 'ref-123',
            integrityToken: 'token-123'
        });
    });

    test('returns actionErrorMessage when verification fails without redirectUrl', async () => {
        // Simulate API returning parsed JSON without redirectUrl (error case)
        const mockResponse = {
            errors: [{
                message: 'Invalid verification code'
            }]
        };

        const mockApi = {
            member: {
                getIntegrityToken: vi.fn(() => Promise.resolve('token-123')),
                verifyOTC: vi.fn(() => Promise.resolve(mockResponse))
            }
        };

        const result = await ActionHandler({
            action: 'verifyOTC',
            data: {otc: '000000', otcRef: 'ref-123'},
            api: mockApi
        });

        expect(result.action).toBe('verifyOTC:failed');
        expect(result.actionErrorMessage).toBe('Invalid verification code');
        expect(result.popupNotification).toBeUndefined();
    });

    test('returns actionErrorMessage on API exception', async () => {
        const mockApi = {
            member: {
                getIntegrityToken: vi.fn(() => Promise.resolve('token-123')),
                verifyOTC: vi.fn(() => Promise.reject(new Error('Network error')))
            }
        };

        const result = await ActionHandler({
            action: 'verifyOTC',
            data: {otc: '123456', otcRef: 'ref-123'},
            api: mockApi
        });

        expect(result.action).toBe('verifyOTC:failed');
        expect(result.actionErrorMessage).toBe('Failed to verify code, please try again');
        expect(result.popupNotification).toBeUndefined();
    });

    test('passes redirect parameter to verifyOTC API call, includes integrity token', async () => {
        const mockApi = {
            member: {
                getIntegrityToken: vi.fn(() => Promise.resolve('integrity-123')),
                verifyOTC: vi.fn(() => Promise.resolve({
                    redirectUrl: 'https://example.com/custom'
                }))
            }
        };

        await ActionHandler({
            action: 'verifyOTC',
            data: {
                otc: '123456',
                otcRef: 'ref-123',
                redirect: 'https://custom-redirect.com'
            },
            api: mockApi
        });

        expect(mockApi.member.verifyOTC).toHaveBeenCalledWith({
            otc: '123456',
            otcRef: 'ref-123',
            redirect: 'https://custom-redirect.com',
            integrityToken: 'integrity-123'
        });
    });

    describe('edge cases', () => {
        test('handles response without redirectUrl or message', async () => {
            const mockApi = {
                member: {
                    getIntegrityToken: vi.fn(() => Promise.resolve('token-123')),
                    verifyOTC: vi.fn(() => Promise.resolve({})) // empty response
                }
            };

            const result = await ActionHandler({
                action: 'verifyOTC',
                data: {otc: '123456', otcRef: 'ref-123'},
                api: mockApi
            });

            expect(result.action).toBe('verifyOTC:failed');
            expect(result.actionErrorMessage).toBeDefined();
        });
    });
});
