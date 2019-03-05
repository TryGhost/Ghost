/* eslint-disable */
'use strict';

module.exports = {
    name: 'asset-delivery',

    isDevelopingAddon() {
        return true;
    },

    contentFor(type, config) {
        let min = config.environment === 'production' ? '.min' : '';

        if (type === 'minifiedInProductionCss') {
            return `
                <link rel="stylesheet" href="assets/vendor${min}.css">
                <link rel="stylesheet" href="assets/ghost${min}.css" title="light">
            `;
        }

        if (type === 'minifiedInProductionJs') {
            return `
                <script src="assets/vendor${min}.js"></script>
                <script src="assets/ghost${min}.js"></script>
            `;
        }
    },

    postBuild: function (results) {
        var fs = this.project.require('fs-extra'),
            walkSync = this.project.require('walk-sync'),
            assetsIn = results.directory + '/assets',
            templateOutDir = '../server/web/admin/views',
            assetsOut = '../built/assets',
            assets = walkSync(assetsIn);

        fs.ensureDirSync(assetsOut);

        if (fs.existsSync(results.directory + '/index.min.html')) {
            fs.copySync(results.directory + '/index.min.html', `${templateOutDir}/default-prod.html`, {overwrite: true, dereference: true});
        } else {
            fs.copySync(results.directory + '/index.html', `${templateOutDir}/default.html`, {overwrite: true, dereference: true});
        }

        assets.forEach(function (relativePath) {
            if (relativePath.slice(-1) === '/') { return; }

            fs.copySync(assetsIn + '/' + relativePath, assetsOut + '/' + relativePath, {overwrite: true, dereference: true});
        });
    }
};
