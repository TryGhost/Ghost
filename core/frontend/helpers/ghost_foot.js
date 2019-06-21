// # Ghost Foot Helper
// Usage: `{{ghost_foot}}`
//
// Outputs scripts and other assets at the bottom of a Ghost theme
const proxy = require('./proxy');
const _ = require('lodash');
const SafeString = proxy.SafeString;
const api = proxy.api;

// We use the name ghost_foot to match the helper for consistency:
module.exports = function ghost_foot(options) { // eslint-disable-line camelcase
    const apiVersion = data.root._locals.apiVersion;
    let settingsController = api[apiVersion].publicSettings || api[apiVersion].settings;
    return settingsController.browse({}).then((settings) => {
        let globalCodeinjection = '';
        if (_.isArray(settings)) {
            globalCodeinjection = settings.find(setting => setting.key === 'ghost_foot').value;
        } else {
            globalCodeinjection = settings.settings['ghost_foot'];
        }
        const postCodeinjection = options.data.root && options.data.root.post ? options.data.root.post.codeinjection_foot : null;
        let foot = [];
        if (!_.isEmpty(globalCodeinjection)) {
            foot.push(globalCodeinjection);
        }
    
        if (!_.isEmpty(postCodeinjection)) {
            foot.push(postCodeinjection);
        }
        return new SafeString(foot.join(' ').trim());
    });
};
