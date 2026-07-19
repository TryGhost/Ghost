import PostScheduling from './post-scheduling';
import internalKeys from '../internal-keys';
import adapterManager from '../adapter-manager';

// CJS modules without TS declarations — typed loosely at the boundary.
const urlUtils = require('../../../shared/url-utils');

export default new PostScheduling({
    apiUrl: urlUtils.urlFor('api', {type: 'admin'}, true),
    adapter: adapterManager.getAdapter('scheduling'),
    internalKeys
});
