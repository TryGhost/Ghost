import {describe, expect, it} from 'vitest';
import {canonicalizeFilter} from '@src/views/filters/canonical-filter';

describe('canonicalizeFilter', () => {
    it('sorts filter clauses deterministically', () => {
        const canonical = canonicalizeFilter([
            "status:paid",
            "name:~'alex'",
            'label:[vip,early]'
        ]);

        expect(canonical).toBe("label:[vip,early]+name:~'alex'+status:paid");
    });

    it('removes duplicate clauses during canonicalization', () => {
        const canonical = canonicalizeFilter([
            "status:paid",
            "status:paid",
            "name:~'alex'"
        ]);

        expect(canonical).toBe("name:~'alex'+status:paid");
    });
});
