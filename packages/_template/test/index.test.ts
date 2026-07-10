import assert from 'node:assert/strict';
import {describe, it} from 'vitest';
import {greeting} from '../src/index';

describe('{{NAME}}', function () {
    it('returns a greeting', function () {
        assert.equal(greeting(), 'Hello from @tryghost/{{NAME}}');
    });
});
