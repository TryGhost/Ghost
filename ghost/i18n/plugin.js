// @ts-check
const {join} = require('node:path');
const {readdir, readFile, unlink} = require('node:fs/promises');
const MagicString = require('magic-string');

const LOCALES_PATH = join(__dirname, './locales');
const LOCAL_LOCALES_REPLACEMENT = 'global.GHOST_INLINE_TRANSLATIONS';

/**
 * @param {import('./browser.mjs').GhostNamespace} namespace
 * @param {string} locale
 * @returns {Promise<{
    data: Record<string, string>;
    asset: {
        type: 'asset';
        fileName: string,
        source: string;
    };
 }>}
 */
async function processTranslation(namespace, locale) {
    const diskPath = `${LOCALES_PATH}/${locale}/${namespace}.json`;
    const contents = await readFile(diskPath, 'utf8');
    const data = JSON.parse(contents);

    return {
        data,
        asset: {
            type: 'asset',
            fileName: `locales/${locale}/${namespace}.json`,
            // Since these files don't get processed, minify the contents using `JSON.stringify`
            source: JSON.stringify(data)
        }
    };
}

/**
 * @param {import('./browser.mjs').GhostNamespace} namespace
 * @param {Set<string> | null} invalidatedLocales [mutated] the set of locales that changed. If not provided, all locales will be loaded from disk.
 * @param {Record<string, Record<string, string>>} allTranslations [mutated] all translations loaded from disk
 */
async function loadTranslations(namespace, invalidatedLocales, allTranslations) {
    /** @type {string[]} */
    let locales;
    if (invalidatedLocales) {
        locales = Array.from(invalidatedLocales);

        // Common path - no locales changed
        if (locales.length === 0) {
            return [];
        }

        invalidatedLocales.clear();
    } else {
        locales = await readdir(LOCALES_PATH);
    }

    /** @type {import('rollup').EmittedAsset[]} */
    const assets = [];

    await Promise.all(locales.map(async (locale) => {
        try {
            const {data, asset} = await processTranslation(namespace, locale);
            allTranslations[locale] = data;
            assets.push(asset);
        } catch {
            // Ignore invalid locales, or locales that don't have this namespace
        }
    }));

    return assets;
}

function generateInlineTranslationsCode(translations) {
    return `JSON.parse(${JSON.stringify(JSON.stringify(translations))})`;
}

/**
 * @param {string} text
 * @param {string} search
 * @param {string} replace
 */
function magicReplaceOnce(text, search, replace) {
    const source = new MagicString.default(text);
    const startingIndex = text.indexOf(search);
    const endingIndex = startingIndex + search.length;

    source.update(startingIndex, endingIndex, replace);

    return {
        code: source.toString(),
        map: source.generateMap()
    };
}

/**
 * @param {import('./browser.mjs').GhostNamespace} namespace
 * @param {'opt-in' | 'opt-out' | 'solo'} stability The stability of external locales for the namespace
 *   - `opt-in` - A separate external locales bundle (`${namespace}-no-locales.min.js`) will be generated
 *   - `opt-out` - The primary bundle will have external locales, and `${namespace}-locales.min.js` will have bundled locales
 *   - `solo` - Only one bundle (external locales) will be generated
 *  Note: extra bundles will not have source maps
 * @returns {import('vite').Plugin}
 */
function ghostI18nPlugin(namespace, stability) {
    const namespaceJson = `${namespace}.json`;
    let firstRun = true;
    const localesToBuild = new Set();
    /** @type {Record<string, Record<string, string>>} */
    const allTranslations = {};
    /**
     * @description The output directory, used when a locale is deleted in watch mod
     * @type {string}
     */
    let outputRoot;

    return {
        name: 'vite-plugin-ghost-i18n',
        configResolved(config) {
            outputRoot = config.build.outDir;
        },
        async buildStart(/* options */) {
            if (this.meta.watchMode && firstRun) {
                this.addWatchFile(LOCALES_PATH);
            }

            // For the first run we want to trigger all translations to be copied.
            // In consecutive runs we only want changed translations to be copied.
            const assets = await loadTranslations(namespace, firstRun ? null : localesToBuild, allTranslations);
            firstRun = false;
            for (const asset of assets) {
                this.emitFile(asset);
            }
        },
        transform(code/* , id */) {
            if (!code.includes(LOCAL_LOCALES_REPLACEMENT)) {
                return null;
            }

            // In `solo` mode, we don't need any translations --> empty object
            // In `opt-in` mode, translations are bundled separately --> empty object
            // In `opt-out` mode, translations are bundled with the main bundle --> translations
            const translations = stability === 'opt-out' || stability === 'solo' ? {} : allTranslations;
            return magicReplaceOnce(code, LOCAL_LOCALES_REPLACEMENT, generateInlineTranslationsCode(translations));
        },
        /**
         * @description Emits the extra bundle for stability modes that require it.
         * Note: This bundle is a find/replace version of the main bundle, without sourcemaps.
         */
        generateBundle(options, bundle/* , isWrite */) {
            if (stability === 'solo') {
                return;
            }

            /** @type {import('rollup').OutputChunk} */
            // @ts-expect-error type narrowing isn't working, but it's done in the next line
            const mainBundle = bundle[`${namespace}.min.js`];

            if (!mainBundle || mainBundle.type !== 'chunk') {
                this.error(`Chunk ${namespace}.min.js not found for translations`);
            }

            const localesText = generateInlineTranslationsCode(allTranslations);
            const noLocalesText = generateInlineTranslationsCode({});

            let fileName;
            let search;
            let replace;

            if (stability === 'opt-in') {
                fileName = `${namespace}-no-locales.min.js`;
                // The optimizer will rewrite the string to reduce its size, so we're forced to use a regex match.
                // It's not common to call `JSON.parse` on a constant string, so explicitly match quotes to
                // avoid matching other calls.
                search = new RegExp(`JSON.parse\\([\`"'].*?[\`"']\\);`, 'g');
                replace = noLocalesText;
            } else {
                fileName = `${namespace}-locales.min.js`;
                search = new RegExp(`JSON.parse\\("{}"\\);`, 'g');
                replace = localesText;
            }

            const matches = Array.from(mainBundle.code.matchAll(search));

            if (matches.length === 0) {
                this.error(`Missing marker to inline translations on ${fileName}`);
            }

            if (matches.length > 1) {
                this.error(`Multiple markers found when inlining translations on ${fileName}`);
            }

            this.emitFile({
                type: 'asset',
                fileName,
                source: mainBundle.code.replace(matches[0][0], replace + ';')
            });
        },
        /**
         * @param {string | null} property
         */
        resolveImportMeta(property) {
            // In `umd` mode, rollup synthetically defines `import.meta.url` which breaks path resolution for CDNs
            if (property === 'url') {
                return 'import.meta.url';
            }

            return null;
        },
        async watchChange(path, {event}) {
            // CASE: A file or unrelated namespace was changed, nothing to do
            if (!path.startsWith(LOCALES_PATH) || !path.endsWith(namespaceJson)) {
                return;
            }

            const locale = path.replace(LOCALES_PATH, '')
                .replace(namespaceJson, '')
                .replaceAll('/', '');

            // CASE: A file was deleted, try to delete the emitted asset. Fail silently since it's not critical
            if (event === 'delete') {
                await unlink(`${outputRoot}/locales/${locale}/${namespaceJson}`).catch(() => {});
                return;
            }

            // CASE: A file was created or modified, schedule it to (re)built in the next pass
            localesToBuild.add(locale);
        }
    };
}

module.exports.ghostI18nPlugin = ghostI18nPlugin;
