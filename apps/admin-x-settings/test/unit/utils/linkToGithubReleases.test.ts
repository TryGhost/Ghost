import * as assert from 'assert/strict';
import {linkToGitHubReleases} from '../../../src/utils/linkToGithubReleases';

describe('linkToGithubRelease', function () {
    it('handles empty version', function () {
        const link = linkToGitHubReleases('');
        assert.equal(link, '');
    });

    it('handles plain version release', function () {
        const link = linkToGitHubReleases('5.69.0');
        assert.equal(link, 'https://github.com/TryGhost/Ghost/releases/tag/v5.69.0');
    });

    it('handles plain version with +moya suffix', function () {
        const link = linkToGitHubReleases('5.69.0+moya');
        assert.equal(link, 'https://github.com/TryGhost/Ghost/releases/tag/v5.69.0');
    });

    it('handles git describe output', function () {
        const link = linkToGitHubReleases('5.69.0-0-gabcdef');
        assert.equal(link, 'https://github.com/TryGhost/Ghost/commit/abcdef');
    });

    it('handles git describe output with +moya suffix', function () {
        const link = linkToGitHubReleases('5.69.0-0-gabcdef+moya');
        assert.equal(link, 'https://github.com/TryGhost/Ghost/commit/abcdef');
    });

    it('handles prerelease version', function () {
        const link = linkToGitHubReleases('5.70.0-pre-gabcdef+moya');
        assert.equal(link, 'https://github.com/TryGhost/Ghost/commit/abcdef');
    });
});
