/* eslint-disable */
'use strict';

const fs = require('fs');
const path = require('path');

module.exports = {
    name: 'sourcemap-postprocess',

    isDevelopingAddon() {
        return true;
    },

    postBuild: function (results) {
        // read all .map files in the /assets directory
        const assets = fs.readdirSync(path.join(results.directory, 'assets'));
        const mapFiles = assets.filter((file) => file.endsWith('.map'));

        // loop over the mapfiles and add a "sourceRoot" key to each one
        mapFiles.forEach((file) => {
            const mapFilePath = path.join(results.directory, 'assets', file);
            const mapFile = JSON.parse(fs.readFileSync(mapFilePath, 'utf8'));
            const sources = mapFile.sources;
            for (let i = 0; i < sources.length; i++) {
                sources[i] = sources[i].replace('assets/', '');
            }
            fs.writeFileSync(mapFilePath, JSON.stringify(mapFile));
        });
    }
};
