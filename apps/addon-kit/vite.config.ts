import {defineConfig, type Plugin} from 'vite';
import {mkdir, readFile, writeFile} from 'node:fs/promises';
import {dirname, resolve} from 'node:path';

const outDir = resolve(import.meta.dirname, 'dist');
const iifePath = resolve(outDir, 'sandbox-bootstrap.iife.js');

// The sandbox bootstrap runs inside the opaque-origin iframe. The host imports
// it as a plain string (from `@tryghost/addon-kit/bootstrap`) and hands it to
// the iframe over postMessage, so it must be wrapped as an ESM string export.
function wrapBootstrapAsString(): Plugin {
    return {
        name: 'ghost:wrap-bootstrap-as-string',
        async closeBundle() {
            const code = await readFile(iifePath, 'utf8');
            await mkdir(dirname(iifePath), {recursive: true});
            await writeFile(resolve(outDir, 'bootstrap.mjs'), `export default ${JSON.stringify(code)};\n`);
            await writeFile(resolve(outDir, 'bootstrap.d.mts'), 'declare const source: string;\nexport default source;\n');
        }
    };
}

export default defineConfig({
    build: {
        outDir,
        emptyOutDir: true,
        lib: {
            entry: resolve(import.meta.dirname, 'src/sandbox/bootstrap.ts'),
            // The bootstrap is side-effect only; the IIFE global is unused.
            name: '__ghostAddonBootstrapModule',
            formats: ['iife'],
            fileName: () => 'sandbox-bootstrap.iife.js'
        },
        minify: true
    },
    plugins: [wrapBootstrapAsString()]
});
