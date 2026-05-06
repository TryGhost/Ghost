const fs = require('fs-extra');

const customRedirects = require('../../services/custom-redirects');
const {parseJson, parseYaml} = require('../../services/custom-redirects/redirect-config-parser');

/** @type {import('@tryghost/api-framework').Controller} */
const controller = {
    docName: 'redirects',

    download: {
        headers: {
            disposition: {
                type: 'file',
                value: () => 'redirects.json'
            },
            cacheInvalidate: false
        },
        permissions: true,
        query() {
            return customRedirects.api.getAll();
        }
    },

    upload: {
        permissions: true,
        headers: {
            cacheInvalidate: true
        },
        async query(frame) {
            const content = await fs.readFile(frame.file.path, 'utf-8');
            const redirects = frame.file.ext === '.yaml' ? parseYaml(content) : parseJson(content);
            return customRedirects.api.replace(redirects);
        }
    }
};

module.exports = controller;
