import {getSiteTimezone} from '@src/utils/get-site-timezone';

describe('getSiteTimezone', () => {
    it('returns the site timezone if found', () => {
        const result = getSiteTimezone([
            {key: 'ignored', value: true},
            {key: 'timezone', value: 'Africa/Lagos'}
        ]);
        expect(result).toEqual('Africa/Lagos');
    });

    it('returns default timezone if no timezone setting exists', () => {
        const result = getSiteTimezone([
            {key: 'ignored', value: true}
        ]);
        expect(result).toEqual('Etc/UTC');
    });

    it('throws error if timezone setting is not a string', () => {
        expect(() => {
            getSiteTimezone([
                {key: 'timezone', value: true}
            ]);
        }).toThrow(TypeError);
    });

    it('returns the first timezone if multiple timezone settings exist', () => {
        const result = getSiteTimezone([
            {key: 'timezone', value: 'Europe/London'},
            {key: 'timezone', value: 'America/New_York'}
        ]);
        expect(result).toEqual('Europe/London');
    });
});
