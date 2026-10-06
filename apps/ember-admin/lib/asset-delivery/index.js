/* eslint-disable */
'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const camelCase = require('lodash/camelCase');
const {prepareLegacyAdminAssets} = require('../../../../scripts/lib/admin-assets.ts');

const adminXApps = ['activitypub'];

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

                this.packageConfig[`activitypubRemoteConfigUrl`] = '/.ghost/activitypub/stable/client-config';
            }

            return this.packageConfig;
        }
    },

    isDevelopingAddon() {
        return true;
    },

    postBuild: function (results) {
        prepareLegacyAdminAssets({
            emberDist: results.directory,
            destination: path.join(path.dirname(require.resolve('ghost')), 'core/built/admin'),
            activitypubDist: path.resolve('../../apps/activitypub/dist'),
            koenigDist: path.dirname(require.resolve('@tryghost/koenig-lexical')),
            environment: this.env,
            editorUrl: process.env.EDITOR_URL
        });
    }
};
