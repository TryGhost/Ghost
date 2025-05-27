import {describe, it} from 'vitest';
import {expect} from 'vitest';
import {linkToGitHubReleases} from '../../../src/utils/linkToGithubReleases';

describe('linkToGithubRelease', function () {
    it('handles empty version', function () {
        const link = linkToGitHubReleases('');
        expect(link).toBe('');
    });

    it('handles plain version release', function () {
        const link = linkToGitHubReleases('5.69.0');
        expect(link).toBe('https://github.com/TryGhost/Ghost/releases/tag/v5.69.0');
    });

    it('handles plain version with +moya suffix', function () {
        const link = linkToGitHubReleases('5.69.0+moya');
        expect(link).toBe('https://github.com/TryGhost/Ghost/releases/tag/v5.69.0');
    });

    it('handles git describe output', function () {
        const link = linkToGitHubReleases('5.69.0-0-gabcdef');
        expect(link).toBe('https://github.com/TryGhost/Ghost/commit/abcdef');
    });

    it('handles git describe output with +moya suffix', function () {
        const link = linkToGitHubReleases('5.69.0-0-gabcdef+moya');
        expect(link).toBe('https://github.com/TryGhost/Ghost/commit/abcdef');
    });

    it('handles prerelease version', function () {
        const link = linkToGitHubReleases('5.70.0-pre-gabcdef+moya');
        expect(link).toBe('https://github.com/TryGhost/Ghost/commit/abcdef');
    });
});
