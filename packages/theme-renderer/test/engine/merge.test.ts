import assert from 'node:assert/strict';
import {describe, it} from 'vitest';
import {mergeDeep} from '../../src/engine/merge.ts';

describe('mergeDeep', function () {
    it('deep-merges plain objects, later sources winning', function () {
        const result = mergeDeep({}, {data: {site: {title: 'A', url: 'u'}}}, {data: {site: {title: 'B'}}});
        assert.deepEqual(result, {data: {site: {title: 'B', url: 'u'}}});
    });

    it('skips undefined sources, and undefined never overwrites an existing value (lodash merge behavior)', function () {
        const result = mergeDeep({}, {a: 1, b: undefined}, undefined, {c: 2, a: undefined});
        assert.equal(result.a, 1);
        assert.equal(result.c, 2);
        // lodash DOES create missing keys from undefined source values
        assert.ok('b' in result);
        assert.equal(result.b, undefined);
    });

    it('clones nested plain objects instead of sharing references', function () {
        const source = {data: {site: {title: 'A'}}};
        const result = mergeDeep({}, source) as {data: {site: {title: string}}};
        result.data.site.title = 'mutated';
        assert.equal(source.data.site.title, 'A');
    });

    it('assigns class instances (Map) by reference, matching lodash merge', function () {
        const map = new Map([['k', 'v']]);
        const result = mergeDeep({}, {cache: map});
        assert.equal(result.cache, map);
    });

    // Origin oracle: express-hbs lib/hbs.js:499 combines templateOptions with
    // `_.merge({}, self._options.templateOptions, localTemplateOptions)` —
    // lodash merges arrays INDEX-WISE (deep per element), it does not
    // overwrite them. `@site.navigation` is the render-visible case.
    it('merges arrays index-wise like lodash merge (express-hbs semantics)', function () {
        const result = mergeDeep({}, {list: [1, 2]}, {list: [3]});
        assert.deepEqual(result.list, [3, 2]);

        const navigation = mergeDeep(
            {},
            {data: {site: {navigation: [{label: 'Home', url: '/'}, {label: 'About', url: '/about/'}]}}},
            {data: {site: {navigation: [{label: 'Blog'}]}}}
        ) as {data: {site: {navigation: Array<Record<string, string>>}}};
        assert.deepEqual(navigation.data.site.navigation, [
            {label: 'Blog', url: '/'},
            {label: 'About', url: '/about/'}
        ]);
    });
});
