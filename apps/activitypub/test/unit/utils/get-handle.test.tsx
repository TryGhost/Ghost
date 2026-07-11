import getHandle from '../../../src/utils/get-handle';

describe('getHandle', function () {
    it('returns the API-provided handle when present', async function () {
        const user = {
            handle: '@index@activitypub.example',
            preferredUsername: 'index',
            id: 'https://www.platformer.news/'
        };

        const result = getHandle(user);

        expect(result).toBe('@index@activitypub.example');
    });

    it('returns the formatted handle', async function () {
        const user = {
            preferredUsername: 'index',
            id: 'https://www.platformer.news/'
        };

        const result = getHandle(user);

        expect(result).toBe('@index@platformer.news');
    });

    it('returns a default handle if the user object is missing data', async function () {
        const user = {
            preferredUsername: '',
            id: ''
        };

        const result = getHandle(user);

        expect(result).toBe('@unknown@unknown');
    });

    it('returns a default handle if url parsing fails', async function () {
        const user = {
            preferredUsername: 'index',
            id: 'not-a-url'
        };

        const result = getHandle(user);

        expect(result).toBe('@unknown@unknown');
    });
});
