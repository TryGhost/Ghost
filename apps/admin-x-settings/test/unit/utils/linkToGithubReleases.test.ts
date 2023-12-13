import * as assert from 'assert/strict';
import {linkToGitHubReleases} from '../../../src/utils/linkToGithubReleases';

describe('linkToGithubRelease', function () {
    it('generates a link to a release', function () {
        let version = '5.69.0';
        let link = linkToGitHubReleases(version);
        assert.equal(link, 'https://github.com/TryGhost/Ghost/releases/tag/v5.69.0');
    });

    it('strips moya from the version', function () {
        let version = '5.69.0+moya';
        let link = linkToGitHubReleases(version);
        assert.equal(link, 'https://github.com/TryGhost/Ghost/releases/tag/v5.69.0');
    });
});
