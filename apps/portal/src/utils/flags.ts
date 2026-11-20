import type * as Flags from 'country-flag-icons/react/3x2';

/**
 * A country Portal publishes a flag for: every country `country-flag-icons` draws one for. A
 * country code that isn't one of these doesn't compile where a flag's URL is asked for, so a
 * country added to a list Portal shows flags for, such as the calling codes, can't ship without
 * its flag.
 */
export type FlagCountry = keyof typeof Flags;

/**
 * The URL of the folder Portal's flags are published in, which sits beside Portal's script, or
 * undefined where the page has no Portal script whose URL has a folder beside it, such as a
 * script loaded from a `blob:` URL.
 */
function flagsFolder(): string | undefined {
  // Portal's own script: the one a site's settings are read from.
  const script = document.querySelector<HTMLScriptElement>('script[data-ghost]');
  if (!script?.src) {
    return undefined;
  }
  try {
    return new URL('flags/', script.src).href;
  } catch {
    // This is asked for inside a render, where a throw takes the whole of Portal down.
    return undefined;
  }
}

/**
 * Whether this page can load flags at all. Where it can't, an input shows no flag and leaves no
 * room for one.
 */
export function canLoadFlags(): boolean {
  return flagsFolder() !== undefined;
}

/**
 * The URL of a country's flag, an SVG published beside Portal's script as `flags/<country>.svg`,
 * or undefined where the page can't load flags.
 *
 * The flags are separate files so that a reader downloads only the flag they are shown. They are
 * published in the same package as Portal's script and loaded from wherever a site loads that
 * script, so they need nothing from the site's version of Ghost.
 */
export function flagUrl(country: FlagCountry): string | undefined {
  const folder = flagsFolder();
  return folder && `${folder}${country}.svg`;
}
