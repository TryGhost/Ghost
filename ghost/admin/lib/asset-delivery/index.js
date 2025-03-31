/* eslint-disable */
'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const camelCase = require('lodash/camelCase');

const adminXApps = ['admin-x-demo', 'admin-x-settings', 'admin-x-activitypub', 'posts', 'stats'];

function generateHash(filePath) {
    const fileContents = fs.readFileSync(filePath, 'utf8');
    const hash = crypto.createHash('sha256').update(fileContents).digest('hex').slice(0, 10);
    return hash;
}

module.exports = {
    name: 'asset-delivery',

    env: null,

    packageConfig: {},

    config(env) {
        // only set this.env on the first call otherwise when `postBuild()` is
        // called this.env will always be 'test' due to multiple `config()` calls
        if (!this.env) {
            this.env = env;

            const koenigLexicalPath = require.resolve('@tryghost/koenig-lexical');
            this.packageConfig['editorFilename'] = path.basename(koenigLexicalPath);
            this.packageConfig['editorHash'] = process.env.EDITOR_URL ? 'development' : generateHash(koenigLexicalPath);

            // TODO: ideally take this from the package, but that's broken thanks to .cjs file ext
            for (const app of adminXApps) {
                const defaultFilename = `${app}.js`;
                const configName = camelCase(app);
                this.packageConfig[`${configName}Filename`] = defaultFilename;
                this.packageConfig[`${configName}Hash`] = (this.env === 'production') ? generateHash(path.join(`../../apps/${app}/dist`, defaultFilename)) : 'development';
            }

            if (this.env === 'production') {
                for (const [key, value] of Object.entries(this.packageConfig)) {
                    console.log(`Asset-Delivery: ${key} = ${value}`);
                }

                this.packageConfig[`adminXActivitypubCustomUrl`] = 'https://cdn.jsdelivr.net/ghost/admin-x-activitypub@0/dist/admin-x-activitypub.js'
            }

            return this.packageConfig;
        }
    },

    isDevelopingAddon() {
        return true;
    },

    postBuild: function (results) {
        const fs = this.project.require('fs-extra');
        const walkSync = this.project.require('walk-sync');

        const assetsOut = path.join(path.dirname(require.resolve('ghost')), `core/built/admin`);
        fs.removeSync(assetsOut);
        fs.ensureDirSync(assetsOut);

        // the dist folder contains more than just index.html and /assets, especially
        // for development builds but for Ghost's purposes it only needs to serve
        // index.html and /assets

        // copy the index.html file
        fs.copySync(`${results.directory}/index.html`, `${assetsOut}/index.html`, {overwrite: true, dereference: true});

        // get all the `/assets` files, except the `icons` folder
        const assets = walkSync(results.directory + '/assets', {
            ignore: ['icons']
        });

        // loop over any sourcemaps and remove `assets/` key from each one
        assets.filter((file) => file.endsWith('.map')).forEach((file) => {
            const mapFilePath = `${results.directory}/assets/${file}`;
            const mapFile = JSON.parse(fs.readFileSync(mapFilePath, 'utf8'));
            // loop over the sources and remove `assets/` from each one
            mapFile.sources = mapFile.sources.map((source) => source.replace('assets/', ''));
            fs.writeFileSync(mapFilePath, JSON.stringify(mapFile));
        });

        // copy the assets to assetsOut
        assets.forEach(function (relativePath) {
            if (relativePath.slice(-1) === '/') { return; }

            fs.copySync(`${results.directory}/assets/${relativePath}`, `${assetsOut}/assets/${relativePath}`, {overwrite: true, dereference: true});
        });

        // copy assets for each admin-x app
        for (const app of adminXApps) {
            const adminXPath = `../../apps/${app}/dist`;
            const assetsAdminXPath = `${assetsOut}/assets/${app}`;
            if (fs.existsSync(adminXPath)) {
                if (this.env === 'production') {
                    fs.copySync(adminXPath, assetsAdminXPath, {overwrite: true, dereference: true});
                } else {
                    fs.ensureSymlinkSync(adminXPath, assetsAdminXPath);
                }
            } else  {
                console.log(`${app} folder not found`);
            }
        }

        // if we are passed a URL for Koenig-Lexical dev server, we don't need to copy the assets
        if (!process.env.EDITOR_URL) {
            // copy the @tryghost/koenig-lexical assets
            const koenigLexicalPath = path.dirname(require.resolve('@tryghost/koenig-lexical'));
            const assetsKoenigLexicalPath = `${assetsOut}/assets/koenig-lexical`;

            if (fs.existsSync(koenigLexicalPath)) {
                fs.copySync(koenigLexicalPath, assetsKoenigLexicalPath, {overwrite: true, dereference: true});
            } else {
                console.log('Koenig-Lexical folder not found');
            }
        }
    }
};
