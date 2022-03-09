const _ = require('lodash');

const extraAttrs = require('../utils/extra-attrs');
const url = require('../utils/url');

module.exports = (attrs, frame) => {
    url.forSettings(attrs);
    extraAttrs.forSettings(attrs, frame);

    // NOTE: The cleanup of deprecated ghost_head/ghost_foot has to happen here
    //       because codeinjection_head/codeinjection_foot are assigned on a previous
    //      `forSettings` step. This logic can be rewritten once we get rid of deprecated
    //      fields completely.
    if (_.isArray(attrs)) {
        const keysToFilter = ['ghost_head', 'ghost_foot'];

        // NOTE: to support edits of deprecated 'slack' setting artificial 'slack_url' and 'slack_username'
        //       were added to the request body in the input serializer. These should not be returned in response
        //       body unless directly requested
        if (frame.original.body && frame.original.body.settings) {
            const requestedEditSlackUrl = frame.original.body.settings.find(s => s.key === 'slack_url');
            const requestedEditSlackUsername = frame.original.body.settings.find(s => s.key === 'slack_username');

            if (!requestedEditSlackUrl) {
                keysToFilter.push('slack_url');
            }

            if (!requestedEditSlackUsername) {
                keysToFilter.push('slack_username');
            }
        }

        attrs = _.filter(attrs, attr => !(keysToFilter.includes(attr.key)));
    }

    return attrs;
};
