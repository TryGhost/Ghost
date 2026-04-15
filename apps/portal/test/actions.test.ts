import ActionHandler from '../src/actions';
import {vi, type MockInstance} from 'vitest';

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

describe('redeemGift action', () => {
    test('redeems a gift directly for a logged-in member and refreshes member data', async () => {
        const mockApi = {
            gift: {
                redeem: vi.fn(() => Promise.resolve({
                    gifts: [{
                        token: 'gift-token-123',
                        status: 'redeemed'
                    }]
                }))
            },
            member: {
                sessionData: vi.fn(() => Promise.resolve({
                    name: 'Jamie Larson',
                    email: 'jamie@example.com',
                    paid: true,
                    status: 'gift'
                })),
                getIntegrityToken: vi.fn(),
                sendMagicLink: vi.fn()
            }
        };
        const state = {
            member: {
                name: 'Jamie Larson',
                email: 'jamie@example.com',
                status: 'free'
            },
            pageData: {
                token: 'gift-token-123',
                gift: {
                    cadence: 'year',
                    duration: 1,
                    tier: {
                        name: 'Premium'
                    }
                }
            }
        };

        const result = await ActionHandler({
            action: 'redeemGift',
            data: {
                giftToken: 'gift-token-123'
            },
            state,
            api: mockApi
        });

        expect(mockApi.gift.redeem).toHaveBeenCalledWith({token: 'gift-token-123'});
        expect(mockApi.member.sessionData).toHaveBeenCalled();
        expect(mockApi.member.getIntegrityToken).not.toHaveBeenCalled();
        expect(mockApi.member.sendMagicLink).not.toHaveBeenCalled();
        expect(result).toMatchObject({
            action: 'redeemGift:success',
            page: 'accountHome',
            member: {
                status: 'gift'
            },
            notification: {
                type: 'giftRedeem',
                status: 'success'
            }
        });
    });

    test('sends a subscribe magic link with the gift token and redirects back to Portal account', async () => {
        const mockApi = {
            member: {
                getIntegrityToken: vi.fn(() => Promise.resolve('token-123')),
                sendMagicLink: vi.fn(() => Promise.resolve({otc_ref: 'otc-ref-123'}))
            }
        };
        const state = {
            site: {
                url: 'https://example.com/'
            },
            pageData: {
                token: 'gift-token-123'
            }
        };

        const result = await ActionHandler({
            action: 'redeemGift',
            data: {
                email: 'jamie@example.com',
                name: '  Jamie Larson  ',
                giftToken: 'gift-token-123'
            },
            state,
            api: mockApi
        });

        expect(mockApi.member.sendMagicLink).toHaveBeenCalledWith({
            email: 'jamie@example.com',
            emailType: 'subscribe',
            integrityToken: 'token-123',
            includeOTC: true,
            redirect: 'https://example.com/#/portal/account?giftRedemption=true',
            giftToken: 'gift-token-123',
            name: 'Jamie Larson'
        });

        expect(result).toMatchObject({
            page: 'magiclink',
            lastPage: 'giftRedemption',
            otcRef: 'otc-ref-123',
            pageData: {
                token: 'gift-token-123',
                email: 'jamie@example.com',
                redirect: 'https://example.com/#/portal/account?giftRedemption=true'
            }
        });
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

describe('notification actions', () => {
    test('increments notification count after a notification is dismissed', async () => {
        const firstNotification = await ActionHandler({
            action: 'openNotification',
            data: {
                action: 'giftRedemption:failed',
                status: 'error',
                autoHide: false,
                message: 'Gift could not be redeemed'
            },
            state: {
                notification: null,
                notificationSequence: -1
            },
            api: {}
        });

        expect(firstNotification.notification.count).toBe(0);
        expect(firstNotification.notificationSequence).toBe(0);

        const dismissedNotification = await ActionHandler({
            action: 'closeNotification',
            data: {},
            state: {
                ...firstNotification
            },
            api: {}
        });

        expect(dismissedNotification).toEqual({
            notification: null
        });

        const secondNotification = await ActionHandler({
            action: 'openNotification',
            data: {
                action: 'giftRedemption:failed',
                status: 'error',
                autoHide: false,
                message: 'Gift could not be redeemed'
            },
            state: {
                ...firstNotification,
                ...dismissedNotification
            },
            api: {}
        });

        expect(secondNotification.notification.count).toBe(1);
        expect(secondNotification.notificationSequence).toBe(1);
    });
});

describe('continueSubscription action', () => {
    test('returns reloadOnPopupClose on success', async () => {
        const mockApi = {
            member: {
                updateSubscription: vi.fn(() => Promise.resolve()),
                sessionData: vi.fn(() => Promise.resolve({name: 'Test', email: 'test@example.com'}))
            }
        };

        const result = await ActionHandler({
            action: 'continueSubscription',
            data: {subscriptionId: 'sub_123'},
            state: {},
            api: mockApi
        });

        expect(result.reloadOnPopupClose).toBe(true);
        expect(result.action).toBe('continueSubscription:success');
    });

    test('does not return reloadOnPopupClose on failure', async () => {
        const mockApi = {
            member: {
                updateSubscription: vi.fn(() => Promise.reject(new Error('API error')))
            }
        };

        const result = await ActionHandler({
            action: 'continueSubscription',
            data: {subscriptionId: 'sub_123'},
            state: {},
            api: mockApi
        });

        expect(result.reloadOnPopupClose).toBeUndefined();
        expect(result.action).toBe('continueSubscription:failed');
    });
});

describe('cancelSubscription action', () => {
    test('returns reloadOnPopupClose on success', async () => {
        const mockApi = {
            member: {
                updateSubscription: vi.fn(() => Promise.resolve()),
                sessionData: vi.fn(() => Promise.resolve({name: 'Test', email: 'test@example.com'}))
            }
        };

        const result = await ActionHandler({
            action: 'cancelSubscription',
            data: {subscriptionId: 'sub_123', cancellationReason: 'Too expensive'},
            state: {},
            api: mockApi
        });

        expect(result.reloadOnPopupClose).toBe(true);
        expect(result.action).toBe('cancelSubscription:success');
    });

    test('does not return reloadOnPopupClose on failure', async () => {
        const mockApi = {
            member: {
                updateSubscription: vi.fn(() => Promise.reject(new Error('API error')))
            }
        };

        const result = await ActionHandler({
            action: 'cancelSubscription',
            data: {subscriptionId: 'sub_123'},
            state: {},
            api: mockApi
        });

        expect(result.reloadOnPopupClose).toBeUndefined();
        expect(result.action).toBe('cancelSubscription:failed');
    });
});

describe('applyOffer action', () => {
    test('returns reloadOnPopupClose on success', async () => {
        const mockApi = {
            member: {
                applyOffer: vi.fn(() => Promise.resolve()),
                sessionData: vi.fn(() => Promise.resolve({name: 'Test', email: 'test@example.com'}))
            }
        };

        const result = await ActionHandler({
            action: 'applyOffer',
            data: {offerId: 'offer_123', subscriptionId: 'sub_123'},
            state: {},
            api: mockApi
        });

        expect(result.reloadOnPopupClose).toBe(true);
        expect(result.action).toBe('applyOffer:success');
    });

    test('does not return reloadOnPopupClose on failure', async () => {
        const mockApi = {
            member: {
                applyOffer: vi.fn(() => Promise.reject(new Error('API error')))
            }
        };

        const result = await ActionHandler({
            action: 'applyOffer',
            data: {offerId: 'offer_123', subscriptionId: 'sub_123'},
            state: {},
            api: mockApi
        });

        expect(result.reloadOnPopupClose).toBeUndefined();
        expect(result.action).toBe('applyOffer:failed');
    });
});

describe('verifyOTC action', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let originalLocation: any;
    let mockLocationAssign: MockInstance;

    beforeEach(() => {
        mockLocationAssign = vi.fn();
        originalLocation = window.location;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        window.location = {assign: mockLocationAssign} as any;
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
            state: {},
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
            state: {},
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
            state: {},
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
            state: {},
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
                state: {},
                api: mockApi
            });

            expect(result.action).toBe('verifyOTC:failed');
            expect(result.actionErrorMessage).toBeDefined();
        });
    });
});

describe('checkoutGift action', () => {
    test('calls api.member.checkoutGift with correct data', async () => {
        const mockApi = {
            member: {
                checkoutGift: vi.fn(() => Promise.resolve())
            }
        };

        const result = await ActionHandler({
            action: 'checkoutGift',
            data: {tierId: 'tier_123', cadence: 'month'},
            state: {},
            api: mockApi
        });

        expect(mockApi.member.checkoutGift).toHaveBeenCalledWith({
            tierId: 'tier_123',
            cadence: 'month'
        });
        expect(result.action).toBe('checkoutGift:success');
    });

    test('returns failed action with notification on error', async () => {
        const mockApi = {
            member: {
                checkoutGift: vi.fn(() => Promise.reject(new Error('Stripe error')))
            }
        };

        const result = await ActionHandler({
            action: 'checkoutGift',
            data: {tierId: 'tier_123', cadence: 'month'},
            state: {},
            api: mockApi
        });

        expect(result.action).toBe('checkoutGift:failed');
        expect(result.popupNotification).toBeDefined();
        expect(result.popupNotification.type).toBe('checkoutGift:failed');
        expect(result.popupNotification.status).toBe('error');
    });
});
