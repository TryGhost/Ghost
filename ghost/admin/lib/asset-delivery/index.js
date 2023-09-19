/* eslint-disable */
'use strict';

module.exports = {
    name: 'asset-delivery',

    env: null,

    config(env) {
        // only set this.env on the first call otherwise when `postBuild()` is
        // called this.env will always be 'test' due to multiple `config()` calls
        if (!this.env) {
            this.env = env;
        }
    },

    isDevelopingAddon() {
        return true;
    },

    postBuild: function (results) {
        const fs = this.project.require('fs-extra');
        const walkSync = this.project.require('walk-sync');

        const assetsOut = `../core/core/built/admin`;
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
        const adminXSettingsPath = '../../apps/admin-x-settings/dist';
        const assetsAdminXPath = `${assetsOut}/assets/libs/admin-x-settings`;

        if (fs.existsSync(adminXSettingsPath)) {
            if (this.env === 'production') {
                fs.copySync(adminXSettingsPath, assetsAdminXPath, {overwrite: true, dereference: true});
            } else {
                fs.ensureSymlinkSync(adminXSettingsPath, assetsAdminXPath);
            }
        } else  {
            console.log('Admin-X-Settings folder not found');
        }
    }
};
