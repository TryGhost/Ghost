import assert from 'node:assert/strict';
import {createRequire} from 'node:module';

const require = createRequire(__filename);

describe('visibility export map', function () {
    it('supports ESM import via the public subpath', async function () {
        const visibilityModule = await import('@tryghost/kg-default-nodes/visibility');

        assert.equal(typeof visibilityModule.buildDefaultVisibility, 'function');
        assert.equal(typeof visibilityModule.isVisibilityRestricted, 'function');
        assert.equal(typeof visibilityModule.renderWithVisibility, 'function');
        assert.equal(typeof visibilityModule.ALL_MEMBERS_SEGMENT, 'string');
    });

    it('supports CommonJS require via the public subpath', function () {
        const visibilityModule = require('@tryghost/kg-default-nodes/visibility');

        assert.equal(typeof visibilityModule.buildDefaultVisibility, 'function');
        assert.equal(typeof visibilityModule.isVisibilityRestricted, 'function');
        assert.equal(typeof visibilityModule.renderWithVisibility, 'function');
        assert.equal(typeof visibilityModule.ALL_MEMBERS_SEGMENT, 'string');
    });
});
