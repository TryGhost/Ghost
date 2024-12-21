// @ts-check
const {join} = require('node:path');
const {readdir, readFile, unlink} = require('node:fs/promises');

const LOCALES_PATH = join(__dirname, './locales');

/**
 * @param {import('./browser.mjs').GhostNamespace} namespace
 * @param {string} locale
 * @returns {Promise<{
    type: 'asset';
    fileName: string,
    source: string;
 }>}
 */
async function processTranslation(namespace, locale) {
    const diskPath = `${LOCALES_PATH}/${locale}/${namespace}.json`;
    const contents = await readFile(diskPath, 'utf8');
    return {
        type: 'asset',
        fileName: `locales/${locale}/${namespace}.json`,
        // Since these files don't get processed, minify the contents using `JSON.stringify`
        source: JSON.stringify(JSON.parse(contents))
    };
}

/**
 * @param {import('./browser.mjs').GhostNamespace} namespace
 * @param {Set<string> | null} invalidatedLocales [mutated] the set of locales that changed. If not provided, all locales will be loaded from disk.
 */
async function loadTranslations(namespace, invalidatedLocales) {
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
            assets.push(await processTranslation(namespace, locale));
        } catch {
            // Ignore invalid locales, or locales that don't have this namespace
        }
    }));

    return assets;
}

/**
 * @param {import('./browser.mjs').GhostNamespace} namespace
 * @returns {import('vite').Plugin}
 */
function ghostI18nPlugin(namespace) {
    const namespaceJson = `${namespace}.json`;
    let firstRun = true;
    const localesToBuild = new Set();
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
            const assets = await loadTranslations(namespace, firstRun ? null : localesToBuild);
            firstRun = false;
            for (const asset of assets) {
                this.emitFile(asset);
            }
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
