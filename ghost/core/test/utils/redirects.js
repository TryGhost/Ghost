const fs = require('fs-extra');
const path = require('path');

/**
* Set up the redirects file with the extension you want.
*/
module.exports.setupFile = async (contentFolderForTests, ext) => {
    const yamlPath = path.join(contentFolderForTests, 'data', 'redirects.yaml');
    const jsonPath = path.join(contentFolderForTests, 'data', 'redirects.json');

    if (ext === '.json') {
        if (fs.existsSync(yamlPath)) {
            fs.removeSync(yamlPath);
        }
        await fs.copy(path.join(__dirname, 'fixtures', 'data', 'redirects.json'), jsonPath);
    }

    if (ext === '.yaml') {
        if (fs.existsSync(jsonPath)) {
            fs.removeSync(jsonPath);
        }
        await fs.copy(path.join(__dirname, 'fixtures', 'data', 'redirects.yaml'), yamlPath);
    }

    if (ext === null) {
        if (fs.existsSync(yamlPath)) {
            fs.removeSync(yamlPath);
        }
        if (fs.existsSync(jsonPath)) {
            fs.removeSync(jsonPath);
        }
    }
};
