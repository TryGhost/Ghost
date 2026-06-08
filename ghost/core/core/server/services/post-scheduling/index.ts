import PostScheduling from './post-scheduling';
import internalKeys from '../internal-keys';

// CJS modules without TS declarations — typed loosely at the boundary.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const adapterManager = require('../adapter-manager');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const urlUtils = require('../../../shared/url-utils');

export default new PostScheduling({
    apiUrl: urlUtils.urlFor('api', {type: 'admin'}, true),
    adapter: adapterManager.getAdapter('scheduling'),
    internalKeys
});
