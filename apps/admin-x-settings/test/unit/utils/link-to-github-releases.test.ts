import * as assert from 'assert/strict';
import {linkToGitHubReleases} from '@src/utils/link-to-github-releases';

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

    it('handles server build version with epoch.sha', function () {
        const link = linkToGitHubReleases('6.21.2+1710072000.abc1234');
        assert.equal(link, 'https://github.com/TryGhost/Ghost/commit/abc1234');
    });

    it('handles admin build version with sha only', function () {
        const link = linkToGitHubReleases('6.21.2+abc1234');
        assert.equal(link, 'https://github.com/TryGhost/Ghost/commit/abc1234');
    });

    it('handles full 40-char sha in build metadata', function () {
        const sha = 'a'.repeat(40);
        const link = linkToGitHubReleases(`6.21.2+1710072000.${sha}`);
        assert.equal(link, `https://github.com/TryGhost/Ghost/commit/${sha}`);
    });
});
