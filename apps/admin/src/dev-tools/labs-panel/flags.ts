/**
 * The toggleable flag list, read from Ghost's own registry instead of copied.
 *
 * ghost/core/core/shared/labs.js is the source of truth, but nothing exposes it
 * to a browser: labs.getAllFlags() has no consumers, and /settings/ and /config/
 * only report flags that have already been written — which is never the case for
 * the flag you're about to turn on for the first time. So the panel reads the
 * file as text through Vite's ?raw and lifts the two arrays out of it. Nothing to
 * keep in sync here, and adding a flag to labs.js is all it takes to see it.
 *
 * Dev-only by construction: this module is reachable only from the DEV-guarded
 * import in src/app.tsx, and only loaded once the opt-in flag is on, so ?raw is
 * never resolved in a production build.
 *
 * GA flags are skipped deliberately — labs.getAll() forces them true and
 * WRITABLE_KEYS_ALLOWLIST rejects them, so a switch for them would be a lie.
 */

import labsSource from '../../../../../ghost/core/core/shared/labs.js?raw';

/**
 * Pulls one flag array out of labs.js source. Exported and source-taking so the
 * parse can be tested against reformats of labs.js without a build.
 *
 * Throws rather than returning [] when the parse comes up empty. An empty list
 * is not a survivable degradation here: the panel would render "no flags",
 * indistinguishable from a healthy install with nothing to show — and, far
 * worse, WRITABLE_FLAGS derives from these arrays, so writeLab would strip every
 * unparsed flag from a payload that replaces the setting wholesale. A silently
 * half-parsed file would quietly wipe flags. Failing at import is caught by the
 * loader in app.tsx, which logs it and renders nothing.
 *
 * The dangerous breakage is not an empty parse — the throw catches that — but a
 * SHORT one, which looks healthy and takes the missing flags out of the write
 * payload. Two realistic edits produce it, so both are handled rather than
 * guarded: a formatter switching quote style (hence both styles match), and a
 * comment inside the array. `[^\]]*` used to stop at the first `]`, so a single
 * `// [see BER-1234]` truncated the list; matching lazily to the closing `];`
 * and stripping comments first covers that and commented-out entries with it.
 */
export function readFlagArray(source: string, constName: string): string[] {
    // Comments are stripped from the whole source before the array is located,
    // not from the captured body afterwards — otherwise a comment containing the
    // `];` terminator would still truncate the match.
    const code = source.replace(/\/\/[^\n]*/g, '').replace(/\/\*[\s\S]*?\*\//g, '');
    const declaration = new RegExp(`${constName}\\s*=\\s*\\[([\\s\\S]*?)\\];`).exec(code);
    const flags = declaration ? [...declaration[1].matchAll(/['"]([^'"]+)['"]/g)].map(([, flag]) => flag) : [];

    if (!flags.length) {
        throw new Error(
            `Labs panel: couldn't parse ${constName} out of ghost/core/core/shared/labs.js. ` +
            'The panel derives its flag list from that file — it has probably been reformatted, ' +
            'renamed or moved. Update readFlagArray in apps/admin/src/dev-tools/labs-panel/flags.ts.'
        );
    }

    return flags;
}

export const BETA_FLAGS = readFlagArray(labsSource, 'PUBLIC_BETA_FEATURES');
export const PRIVATE_FLAGS = readFlagArray(labsSource, 'PRIVATE_FEATURES');

/**
 * The same set labs.js exports as WRITABLE_KEYS_ALLOWLIST. Reads give back the
 * *effective* flag map (GA flags, the synthetic `members` key and config.local
 * pins folded in by settings-bread-service), none of which a write may contain.
 */
export const WRITABLE_FLAGS = new Set([...BETA_FLAGS, ...PRIVATE_FLAGS]);
