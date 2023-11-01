'use strict';
const fs = require('fs');
const path = require('path');

module.exports = {
  name: require('./package').name,

  isDevelopingAddon() {
    return true;
  },

  postBuild: function (results) {
    const fs = this.project.require('fs-extra');

    // read all .map files in the /assets directory
    const assets = fs.readdirSync(path.join(results.directory, 'assets'));
    const mapFiles = assets.filter((file) => file.endsWith('.map'));

    // loop over the mapfiles and add a "sourceRoot" key to each one
    mapFiles.forEach((file) => {
      const mapFilePath = path.join(results.directory, 'assets', file);
      const mapFile = JSON.parse(fs.readFileSync(mapFilePath, 'utf8'));
      mapFile.sourceRoot = '../';
      fs.writeFileSync(mapFilePath, JSON.stringify(mapFile));
    });
  }
};
