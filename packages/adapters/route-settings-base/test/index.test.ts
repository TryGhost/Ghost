import assert from 'node:assert/strict';
import {describe, it} from 'vitest';

import {RouteSettingsStoreBase, type RouteSettings} from '../src/base.ts';

describe('adapter-base-route-settings', function () {
    it('should have requiredFns property', function () {
        class TestStore extends RouteSettingsStoreBase {
            async get(): Promise<RouteSettings> {
                return {routes: [], collections: [], taxonomies: {}, yamlSource: ''};
            }
            async replace(_: RouteSettings) {
                return;
            }
        }

        const store = new TestStore();
        assert.deepEqual(store.requiredFns, ['get', 'replace']);
    })
});
