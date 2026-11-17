import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Plugin } from 'vite';

/**
 * Vite plugin that publishes every country's flag beside Portal's script, as
 * `flags/<country>.svg` in the build output, so Portal can show one flag by its URL.
 *
 * A flag that Portal's source imports is inlined into `portal.min.js`, as every asset is in a
 * library build, and all of them together would add tens of kilobytes to every page of every
 * site. A file beside the script costs a reader only the flag they are shown.
 *
 * The flags are copied from `flagsDir`, the `3x2` folder of the `country-flag-icons` version that
 * Shade draws Admin's flags from, so Portal and Admin show the same artwork. Only files named by
 * a two-letter country code are copied, which leaves out the package's regional flags, its
 * stylesheet and its archive. A folder with no such file fails the build, so a version of the
 * package that names its files another way can't publish a Portal with no flags.
 */
export function countryFlagsPlugin(flagsDir: string): Plugin {
  return {
    name: 'portal-country-flags',
    generateBundle() {
      const flags = readdirSync(flagsDir).filter((file) => /^[A-Z]{2}\.svg$/.test(file));
      if (flags.length === 0) {
        this.error(`No country flags found in ${flagsDir}`);
      }
      for (const file of flags) {
        this.emitFile({
          type: 'asset',
          fileName: `flags/${file}`,
          source: readFileSync(join(flagsDir, file)),
        });
      }
    },
  };
}
