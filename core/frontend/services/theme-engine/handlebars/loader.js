const glob = require('glob');
const path = require('path');

const helperPath = path.join(__dirname, '../../../', 'helpers');

module.exports.getHelpers = () => {
    const helpers = {};

    // We use glob here because it's already a dependency
    // If we want to get rid of glob we could use E.g. requiredir
    // Or require('fs').readdirSync(__dirname + '/')
    let helperFiles = glob.sync('!(index).js', {cwd: helperPath});
    helperFiles.forEach((helper) => {
        let name = helper.replace(/.js$/, '');
        helpers[name] = require(path.join(helperPath, helper));
    });

    return helpers;
};
