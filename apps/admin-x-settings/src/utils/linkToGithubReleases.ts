import semverParse from 'semver/functions/parse';

export function linkToGitHubReleases(version: string):string {
    if (version.includes('-pre.')) {
        try {
            const semverVersion = semverParse(version, {includePrerelease: true} as any);

            if (semverVersion && semverVersion.build?.[0]) {
                return `https://github.com/TryGhost/Ghost/commit/${semverVersion.build[0]}`;
            }

            return '';
        } catch (e) {
            return '';
        }
    }
    let cleanedVersion = version.replace('+moya', '');

    return `https://github.com/TryGhost/Ghost/releases/tag/v${cleanedVersion}`;
}
