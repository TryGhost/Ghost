declare const __SDK_VERSION__: string;

/**
 * The SDK's version, sent in the hello for Admin's logs. The build and the tests replace
 * `__SDK_VERSION__` with the version in package.json, because the source stays within `src/`
 * and doesn't read package.json.
 */
export const SDK_VERSION: string = __SDK_VERSION__;
