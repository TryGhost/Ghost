import semverParse from 'semver/functions/parse';

// This function needs to support:
// - 5.94.1+moya
// - 5.94.1-0-g1f3e72eac8+moya
// - 5.95.0-pre-g028c1a6+moya
export function linkToGitHubReleases(version: string): string {
    if (!version) {
        return '';
    }

    const cleanedVersion = version.replace('+moya', '');

    try {
        const semverVersion = semverParse(cleanedVersion, {includePrerelease: true} as any);
        const prerelease = semverVersion?.prerelease;

        if (prerelease && prerelease?.length > 0) {
            const splitPrerelease = String(prerelease[0]).split('-');
            const commitHash = splitPrerelease[1];

            if (!commitHash || !commitHash.startsWith('g')) {
                return '';
            }

            const commitHashWithoutG = commitHash.slice(1);

            return `https://github.com/TryGhost/Ghost/commit/${commitHashWithoutG}`;
        }

        return `https://github.com/TryGhost/Ghost/releases/tag/v${cleanedVersion}`;
    } catch (e) {
        return '';
    }
}
