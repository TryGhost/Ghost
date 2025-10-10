import ActionHandler from '../actions';

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
