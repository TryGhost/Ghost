/* eslint-disable */
'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const adminXSettingsPath = '../../apps/admin-x-settings/dist';

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
            const defaultAdminXSettingFilename = 'admin-x-settings.js';
            this.packageConfig['adminXSettingsFilename'] = defaultAdminXSettingFilename;
            this.packageConfig['adminXSettingsHash'] = (this.env === 'production') ? generateHash(path.join(adminXSettingsPath, defaultAdminXSettingFilename)) : 'development';

            if (this.env === 'production') {
                console.log('Admin-X Settings:', this.packageConfig['adminXSettingsFilename'], this.packageConfig['adminXSettingsHash']);
                console.log('Koenig-Lexical:', this.packageConfig['editorFilename'], this.packageConfig['editorHash']);
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

        // copy all the `/assets` files, except the `icons` folder
        const assets = walkSync(results.directory + '/assets', {
            ignore: ['icons']
        });

        assets.forEach(function (relativePath) {
            if (relativePath.slice(-1) === '/') { return; }

            fs.copySync(`${results.directory}/assets/${relativePath}`, `${assetsOut}/assets/${relativePath}`, {overwrite: true, dereference: true});
        });

        // copy the @tryghost/admin-x-settings assets
        const assetsAdminXPath = `${assetsOut}/assets/admin-x-settings`;

        if (fs.existsSync(adminXSettingsPath)) {
            if (this.env === 'production') {
                fs.copySync(adminXSettingsPath, assetsAdminXPath, {overwrite: true, dereference: true});
            } else {
                fs.ensureSymlinkSync(adminXSettingsPath, assetsAdminXPath);
            }
        } else  {
            console.log('Admin-X-Settings folder not found');
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
