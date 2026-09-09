// Node-only theme locale loading. Themes are an fs-backed concept and never
// reach the browser, so this file stays out of the browser graph.
import fs from 'node:fs';
import path from 'node:path';

import createDebug from '@tryghost/debug';
import { z } from 'zod';

import type { I18nOptions, Resources, TranslationResource } from './types.ts';

const debug = createDebug('i18n');

// Theme locale files are uploaded by theme authors, so nothing about their shape
// is guaranteed. The file must be an object, and a value that isn't a string
// becomes undefined, which i18next treats as a missing key. Left as-is, it would
// render a nested object as the literal text "returned an object instead of
// string" in the page. A parse failure throws and is caught below.
const ThemeLocaleFile = z.record(z.string(), z.string().optional().catch(undefined));

// Read fresh on every call so a theme's locale edits land without a restart.
function readLocaleFile(directory: string, locale: string): TranslationResource | undefined {
  // A locale names one file directly inside the theme's locales directory.
  const filePath = path.resolve(directory, `${locale}.json`);
  if (path.dirname(filePath) !== path.resolve(directory)) {
    return undefined;
  }

  try {
    if (!fs.lstatSync(filePath).isFile()) {
      return undefined;
    }

    return ThemeLocaleFile.parse(JSON.parse(fs.readFileSync(filePath, 'utf8')));
  } catch {
    return undefined;
  }
}

export function generateThemeResources(lng: string, options: I18nOptions = {}): Resources {
  const themeLocalesPath = options.themePath;

  debug(`generateThemeResources: ${lng}, ${themeLocalesPath}`);

  if (!themeLocalesPath) {
    return { [lng]: { theme: {} } };
  }

  // Get available theme locales by scanning the directory
  let availableLocales: string[] = [];
  try {
    availableLocales = fs
      .readdirSync(themeLocalesPath, { withFileTypes: true })
      .filter((d) => d.isFile() && d.name.endsWith('.json'))
      .map((file) => file.name.replace('.json', ''));
  } catch {
    // If we can't read the directory, fall back to just trying the requested locale and English
    availableLocales = [lng, 'en'];
  }

  // Always include the requested locale and English as fallbacks
  const locales = [...new Set([lng, ...availableLocales, 'en'])];

  return locales.reduce<Resources>((acc, locale) => {
    let res = readLocaleFile(themeLocalesPath, locale);

    if (res === undefined) {
      if (locale === 'en') {
        debug('Theme en.json file not found');
      } else {
        debug(`Error loading theme locale file: ${locale}`);
        // Fallback to English if it's not the locale we're already trying
        res = readLocaleFile(themeLocalesPath, 'en');
      }
    }

    acc[locale] = { theme: res ?? {} };
    return acc;
  }, {});
}
