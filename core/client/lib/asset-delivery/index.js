    module.exports = {
        name: 'asset-delivery',
        postBuild: function (results) {
            var fs = this.project.require('fs-extra');

            fs.copySync(results.directory + '/index.html', '../server/views/default.hbs');
            fs.copySync('./dist/assets', '../built/assets');
        }
    };
