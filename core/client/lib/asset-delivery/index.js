module.exports = {
    name: 'asset-delivery',
    postBuild: function (results) {
        var fs = this.project.require('fs-extra'),
            cpd = this.project.require('ember-cli-copy-dereference'),
            templateOut = '../server/views/default.hbs',
            assetsOut = '../built/assets';

        fs.removeSync(templateOut);
        fs.removeSync(assetsOut);
        fs.ensureDirSync(assetsOut);

        cpd.sync(results.directory + '/index.html', templateOut);
        cpd.sync(results.directory + '/assets', assetsOut);
    }
};
