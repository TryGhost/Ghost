import assert from 'node:assert/strict';
import {describe, it} from 'vitest';
import {mergeDeep} from '../../src/engine/merge.ts';

describe('mergeDeep', function () {
    it('deep-merges plain objects, later sources winning', function () {
        const result = mergeDeep({}, {data: {site: {title: 'A', url: 'u'}}}, {data: {site: {title: 'B'}}});
        assert.deepEqual(result, {data: {site: {title: 'B', url: 'u'}}});
    });

    it('skips undefined sources and undefined source values (lodash merge behavior)', function () {
        const result = mergeDeep({}, {a: 1, b: undefined}, undefined, {c: 2});
        assert.deepEqual(result, {a: 1, c: 2});
    });

    it('clones nested plain objects instead of sharing references', function () {
        const source = {data: {site: {title: 'A'}}};
        const result = mergeDeep({}, source) as {data: {site: {title: string}}};
        result.data.site.title = 'mutated';
        assert.equal(source.data.site.title, 'A');
    });

    it('assigns class instances by reference and overwrites arrays (documented lodash deviation)', function () {
        const map = new Map([['k', 'v']]);
        const result = mergeDeep({}, {cache: map, list: [1, 2]}, {list: [3]});
        assert.equal(result.cache, map);
        assert.deepEqual(result.list, [3]);
    });
});
