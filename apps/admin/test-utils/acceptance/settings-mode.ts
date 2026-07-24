/**
 * Dual-mode switch for the settings acceptance suites, while the settings UI
 * is being rebuilt behind the `shadeSettings` Labs flag.
 *
 * Two independent knobs:
 *
 * - `SHADE_SETTINGS=1 pnpm exec vitest run -c vitest.acceptance.config.ts ...`
 *   makes the whole run target the Shade settings UI. Files that haven't
 *   declared support are skipped (see setup.ts); files that have get
 *   `labs.shadeSettings: true` folded into the boot table's settings/config
 *   responses, so their unchanged `renderAdminApp("/settings/...")` calls
 *   mount the new UI. Without the env var nothing changes — the default run
 *   stays byte-for-byte the legacy suite.
 *
 * - `enableShadeSettingsMode()` at the top of a test file (before any
 *   describe) declares that the file's suites pass in BOTH modes. Until an
 *   area is rebuilt its suites stay legacy-only by simply not calling it.
 *
 * A suite that overrides `boot.browseSettings`/`boot.browseConfig` with a raw
 * response must fold `shadeSettingsBootLabs()` into that response's `labs` to
 * stay dual-mode; the `labs` render option and untouched boot defaults are
 * handled automatically.
 */

/** True when this acceptance run targets the Shade settings UI. */
export const isShadeSettingsRun: boolean = import.meta.env.SHADE_SETTINGS === "1";

let fileOptedIn = false;

/** Declare (top of a test file) that its suites pass against the Shade settings UI as well as the legacy one. */
export function enableShadeSettingsMode(): void {
    fileOptedIn = true;
}

/** Whether the current test file has opted into Shade-mode runs. */
export function isShadeSettingsSuite(): boolean {
    return fileOptedIn;
}

/** Labs overrides active for this file in this run — spread into hand-rolled settings/config boot responses. */
export function shadeSettingsBootLabs(): Record<string, boolean> {
    return isShadeSettingsRun && fileOptedIn ? { shadeSettings: true } : {};
}
