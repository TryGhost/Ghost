import manifest from './package.json' with { type: 'json' };

// What the build and the tests replace `__SDK_VERSION__` in `src/version.ts` with. The publish
// job sets the version in package.json before it builds, so a published SDK reports its own.
export const sdkVersion = { __SDK_VERSION__: JSON.stringify(manifest.version) };
