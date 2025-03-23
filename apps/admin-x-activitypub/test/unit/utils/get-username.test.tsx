import getUsername from '../../../src/utils/get-username';

describe('getUsername', function () {
    it('returns the formatted username', async function () {
        const user = {
            preferredUsername: 'index',
            id: 'https://www.platformer.news/'
        };

        const result = getUsername(user);

        expect(result).toBe('@index@www.platformer.news');
    });

    it('returns a default username if the user object is missing data', async function () {
        const user = {
            preferredUsername: '',
            id: ''
        };

        const result = getUsername(user);

        expect(result).toBe('@unknown@unknown');
    });

    it('returns a default username if url parsing fails', async function () {
        const user = {
            preferredUsername: 'index',
            id: 'not-a-url'
        };

        const result = getUsername(user);

        expect(result).toBe('@unknown@unknown');
    });
});
