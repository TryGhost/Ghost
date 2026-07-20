import {execSync} from 'node:child_process';
import semver from 'semver';

/**
 * Resolve the base git tag for diff/log comparisons during release preparation.
 *
 * For stable versions (e.g. "6.18.0"), returns "v6.18.0" — the tag for that version.
 * For prerelease versions (e.g. "6.19.0-rc.0"), the tag "v6.19.0-rc.0" won't exist,
 * so we find the most recent stable version tag in HEAD's ancestry using git describe.
 *
 * @param {string} version - The current Ghost version from package.json
 * @param {string} repoDir - Path to the Ghost repo checkout
 * @returns {{tag: string, isPrerelease: boolean}}
 */
export function resolveBaseTag(version, repoDir) {
    if (semver.prerelease(version)) {
        const tag = execSync(
            `git describe --tags --abbrev=0 --match 'v[0-9]*.[0-9]*.[0-9]*' --exclude 'v*-*' HEAD`,
            {cwd: repoDir, encoding: 'utf8'}
        ).trim();

        return {tag, isPrerelease: true};
    }

    return {
        tag: `v${version}`,
        isPrerelease: false
    };
}
