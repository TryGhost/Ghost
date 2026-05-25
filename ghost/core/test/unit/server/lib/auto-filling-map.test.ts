import assert from 'node:assert/strict';
import {AutoFillingMap} from '../../../../core/server/lib/auto-filling-map';

describe('AutoFillingMap', function () {
    it('computes on first get, then returns the cached promise', async function () {
        let callCount = 0;
        const map = new AutoFillingMap<string, Promise<string>>(async (key) => {
            callCount += 1;
            return `value-${key}`;
        });

        const first = await map.get('a');
        const second = await map.get('a');

        assert.equal(first, 'value-a');
        assert.equal(second, 'value-a');
        assert.equal(callCount, 1);
    });

    it('caches each key independently', async function () {
        let callCount = 0;
        const map = new AutoFillingMap<string, Promise<string>>(async (key) => {
            callCount += 1;
            return `value-${key}`;
        });

        assert.equal(await map.get('a'), 'value-a');
        assert.equal(await map.get('b'), 'value-b');
        assert.equal(callCount, 2);
    });

    it('dedupes concurrent in-flight calls for the same key', async function () {
        let callCount = 0;
        const map = new AutoFillingMap<string, Promise<string>>(async (key) => {
            callCount += 1;
            await new Promise((resolve) => {
                setTimeout(resolve, 10);
            });
            return `value-${key}`;
        });

        const results = await Promise.all([map.get('a'), map.get('a'), map.get('a')]);

        assert.deepEqual(results, ['value-a', 'value-a', 'value-a']);
        assert.equal(callCount, 1);
    });

    it('delete(key) clears one entry; the next get recomputes', async function () {
        let callCount = 0;
        const map = new AutoFillingMap<string, Promise<string>>(async (key) => {
            callCount += 1;
            return `v${callCount}-${key}`;
        });

        await map.get('a');
        await map.get('b');
        map.delete('a');

        await map.get('a'); // recomputes → callCount 3
        await map.get('b'); // still cached
        assert.equal(callCount, 3);
    });

    it('clear() empties every entry', async function () {
        let callCount = 0;
        const map = new AutoFillingMap<string, Promise<string>>(async (key) => {
            callCount += 1;
            return `value-${key}`;
        });

        await map.get('a');
        await map.get('b');
        map.clear();

        await map.get('a');
        await map.get('b');
        assert.equal(callCount, 4);
    });
});
