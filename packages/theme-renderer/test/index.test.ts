import assert from 'node:assert/strict';
import {describe, it} from 'vitest';
import {greeting} from '../src/index.ts';

describe('theme-renderer', function () {
    it('returns a greeting', function () {
        assert.equal(greeting(), 'Hello from @tryghost/theme-renderer');
    });
});
