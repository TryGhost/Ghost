// @ts-expect-error - semver subpath has no types
import semverParse from 'semver/functions/parse';

// Supported version formats:
// - 6.21.2                          → release tag
// - 6.21.2+1710072000.abc1234       → commit (server: semver+epoch.sha)
// - 6.21.2+abc1234                  → commit (admin: semver+sha)
// - 5.94.1+moya                     → release tag (legacy)
// - 5.94.1-0-gabcdef+moya           → commit (legacy git describe)
// - 5.95.0-pre-gabcdef+moya         → commit (legacy canary)
export function linkToGitHubReleases(version: string): string {
    if (!version) {
        return '';
    }

    // Extract build metadata (everything after +) before semver parsing strips it
    const plusIndex = version.indexOf('+');
    const buildMetadata = plusIndex !== -1 ? version.slice(plusIndex + 1) : '';
    const versionWithoutBuild = plusIndex !== -1 ? version.slice(0, plusIndex) : version;

    // Check build metadata for a commit SHA
    if (buildMetadata && buildMetadata !== 'moya') {
        // New format: "epoch.sha" or just "sha"
        const parts = buildMetadata.split('.');
        const sha = parts[parts.length - 1];

        if (sha && /^[0-9a-f]{7,40}$/.test(sha)) {
            return `https://github.com/TryGhost/Ghost/commit/${sha}`;
        }
    }

    // Check pre-release segment for a commit SHA (legacy format: -0-gabcdef or -pre-gabcdef)
    try {
        const semverVersion = semverParse(versionWithoutBuild, {includePrerelease: true} as any);
        const prerelease = semverVersion?.prerelease;

        if (prerelease && prerelease.length > 0) {
            const splitPrerelease = String(prerelease[0]).split('-');
            const commitHash = splitPrerelease[1];

            if (commitHash?.startsWith('g')) {
                return `https://github.com/TryGhost/Ghost/commit/${commitHash.slice(1)}`;
            }

            // Has pre-release but no recognizable commit hash
            return '';
        }
    } catch {
        return '';
    }

    // Plain semver (with or without +moya) → release tag
    return `https://github.com/TryGhost/Ghost/releases/tag/v${versionWithoutBuild}`;
}
