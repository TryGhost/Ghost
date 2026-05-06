const fs = require('fs-extra');

const customRedirects = require('../../services/custom-redirects');
const {parseJson, parseYaml} = require('../../services/custom-redirects/redirect-config-parser');

const YAML_EXTENSIONS = new Set(['.yaml', '.yml']);

// Defensive normalisation: the upload middleware already lowercases
// extensions and rejects anything outside `.json` / `.yaml`, but
// matching on the lower-cased value and accepting `.yml` as an alias
// keeps a future allow-list tweak from silently misrouting a YAML
// upload through the JSON parser.
const parseUpload = (content, rawExt) => {
    const ext = (rawExt || '').toLowerCase();
    return YAML_EXTENSIONS.has(ext) ? parseYaml(content) : parseJson(content);
};

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
            const redirects = parseUpload(content, frame.file.ext);
            return customRedirects.api.replace(redirects);
        }
    }
};

module.exports = controller;
