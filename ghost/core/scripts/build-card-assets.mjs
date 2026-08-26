#!/usr/bin/env node

/**
 * Builds the card asset manifest.
 *
 * Every card ships optional CSS and JS source files in
 * core/frontend/src/cards. A theme picks a subset of them via its `card_assets`
 * config, and Ghost serves that subset as /public/cards.min.{css,js}.
 *
 * The subset is the only variable — the card sources themselves are immutable
 * for a given Ghost release. So we minify each card once here, at build time,
 * and record the results in a manifest. At runtime Ghost just concatenates the
 * chunks the active theme asked for, which makes the served bytes (and
 * therefore the ?v= cache-busting hash) identical across every process and
 * every boot.
 */

import esbuild from 'esbuild';
import path from 'path';
import fs from 'fs';
import logging from '@tryghost/logging';

const projectRoot = process.cwd().endsWith('ghost/core') || process.cwd().endsWith('ghost\\core')
    ? process.cwd()
    : path.join(process.cwd(), 'ghost', 'core');

const srcDir = path.join(projectRoot, 'core/frontend/src/cards');
const destFile = path.join(projectRoot, 'core/frontend/public/cards.manifest.json');

const LOADERS = {
    css: {loader: 'css'},
    js: {loader: 'js', target: ['es2020']}
};

// header_v2.css is a second stylesheet for the public `header` card, not a
// separate configurable card. This exact path override is intentional — `_vN`
// filename suffixes are not a convention for grouping card assets.
const PUBLIC_CARD_ASSET_NAMES = new Map([
    ['css/header_v2.css', 'header']
]);

export async function buildType(type, sourceDir = srcDir) {
    const dir = path.join(sourceDir, type);
    const suffix = `.${type}`;
    const files = fs.readdirSync(dir).filter(file => file.endsWith(suffix)).sort();

    const chunks = {};
    for (const file of files) {
        const contents = fs.readFileSync(path.join(dir, file), 'utf8');
        const {code} = await esbuild.transform(contents, {minify: true, ...LOADERS[type]});
        const sourceName = file.slice(0, -suffix.length);
        const cardName = PUBLIC_CARD_ASSET_NAMES.get(`${type}/${file}`) || sourceName;

        if (Object.hasOwn(chunks, cardName)) {
            // Match the separator used when the runtime service concatenates
            // separate chunks, keeping the default bundle bytes stable.
            const separator = type === 'js' ? ';\n' : '\n';
            chunks[cardName] += `${separator}${code}`;
        } else {
            chunks[cardName] = code;
        }
    }

    logging.debug(`✓ ${files.length} card ${type} files minified`);

    return chunks;
}

export async function buildCardAssets() {
    const manifest = {};
    for (const type of Object.keys(LOADERS)) {
        manifest[type] = await buildType(type);
    }

    fs.mkdirSync(path.dirname(destFile), {recursive: true});
    fs.writeFileSync(destFile, JSON.stringify(manifest));

    logging.debug(`Card asset manifest written to ${destFile}`);
}

if (import.meta.main) {
    await buildCardAssets();
}
