import {resolve} from 'node:path';

import {execa} from 'execa';

import {ROOT_DIR} from './lib/constants.js';
import {getPublishablePackages, getWorkspace} from './lib/pnpm.js';
import {readJson} from './lib/utils.js';

const workspace = await getWorkspace();
const packages = await getPublishablePackages(workspace);
const ghostDir = 'ghost/core';

// Ghost Core is released through the main Ghost release lane rather than the
// changeset-driven package lane, so versioning.ignore deliberately excludes it
// from getPublishablePackages(). It still produces a public npm artifact and
// must satisfy the same packaging check.
if (!packages.some(pkg => pkg.name === 'ghost')) {
    packages.push({
        name: 'ghost',
        dir: ghostDir,
        manifest: await readJson(resolve(ROOT_DIR, ghostDir, 'package.json')),
        pkgPath: `${ghostDir}/package.json`
    });
}

const results = await Promise.all(packages.map(async (pkg) => {
    const {stdout} = await execa('pnpm', [
        '--config.ignore-scripts=true',
        'pack',
        '--dry-run',
        '--json'
    ], {
        cwd: resolve(ROOT_DIR, pkg.dir)
    });
    const pack = JSON.parse(stdout);
    const hasLicense = pack.files.some(file => file.path === 'LICENSE');

    return hasLicense ? null : `${pkg.name} (${pkg.dir})`;
}));

const missing = results.filter(Boolean);

if (missing.length > 0) {
    console.error('Publishable packages missing a root LICENSE from their packed artifact:');
    for (const pkg of missing) {
        console.error(`- ${pkg}`);
    }
    process.exitCode = 1;
} else {
    console.log(`Verified root LICENSE files in ${packages.length} publishable package artifacts.`);
}
