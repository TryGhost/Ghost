import * as assert from 'assert/strict';
import {SOCIAL_PLATFORM_CONFIG_BY_KEY, normalizeSocialInput} from '../../../src/utils/social-urls/index';

describe('normalizeSocialInput', () => {
    it('returns empty display and null stored for empty input', () => {
        const result = normalizeSocialInput('linkedin', '');
        assert.equal(result.displayValue, '');
        assert.equal(result.storedValue, null);
    });

    it('produces a displayValue that round-trips through storage', () => {
        // The post-blur display must match what the field will show on reload,
        // which is toDisplayValue(storedValue). Otherwise the user sees one
        // value after blur and a different value after refresh.
        const cases: Array<{key: Parameters<typeof normalizeSocialInput>[0]; input: string}> = [
            {key: 'linkedin', input: 'https://uk.linkedin.com/in/ghost-team'},
            {key: 'linkedin', input: 'linkedin.com/in/ghost-team'},
            {key: 'twitter', input: 'https://x.com/@ghost'},
            {key: 'facebook', input: 'facebook.com/ghost'},
            {key: 'mastodon', input: 'https://mastodon.social/@ghost'},
            {key: 'youtube', input: 'http://youtube.com/@ghost'}
        ];

        for (const {key, input} of cases) {
            const {displayValue, storedValue} = normalizeSocialInput(key, input);
            const expected = SOCIAL_PLATFORM_CONFIG_BY_KEY[key].toDisplayValue(storedValue);
            assert.equal(displayValue, expected, `displayValue should round-trip for ${key} input "${input}"`);
        }
    });

    it('strips the regional subdomain from LinkedIn display because it is not in storage', () => {
        // `uk.linkedin.com` is a valid input, but the stored handle drops the
        // regional prefix. The displayed value after blur should reflect what
        // will be displayed on reload — `www.linkedin.com`, not `uk.`.
        const {displayValue, storedValue} = normalizeSocialInput('linkedin', 'https://uk.linkedin.com/in/ghost-team');
        assert.equal(storedValue, 'ghost-team');
        assert.equal(displayValue, 'https://www.linkedin.com/in/ghost-team');
    });
});
