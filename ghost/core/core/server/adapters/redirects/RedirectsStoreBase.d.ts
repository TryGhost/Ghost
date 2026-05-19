/* eslint-disable ghost/filenames/match-regex --
 * PascalCase mirrors the runtime `RedirectsStoreBase.js` so the TS
 * adapter can default-import via the matching declaration file.
 */
declare class RedirectsStoreBase {
    readonly requiredFns: ReadonlyArray<string>;
}

export default RedirectsStoreBase;
