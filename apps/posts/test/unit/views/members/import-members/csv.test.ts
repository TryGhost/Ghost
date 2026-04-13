import {describe, expect, it} from 'vitest';
import {parseCSV, unparseErrorCSV} from '@src/views/members/components/bulk-action-modals/import-members/csv';

describe('csv helpers', () => {
    it('parses CSV rows using header keys', () => {
        const data = parseCSV('name,email\nAlice,alice@example.com');

        expect(data).toEqual([{name: 'Alice', email: 'alice@example.com'}]);
    });

    it('handles escaped quotes and preserves quoted spaces', () => {
        const data = parseCSV('name,note\nAlice,"  hello ""friend""  "');

        expect(data).toEqual([{name: 'Alice', note: '  hello "friend"  '}]);
    });

    it('skips blank rows', () => {
        const data = parseCSV('name,email\nAlice,alice@example.com\n\nBob,bob@example.com\n');

        expect(data).toEqual([
            {name: 'Alice', email: 'alice@example.com'},
            {name: 'Bob', email: 'bob@example.com'}
        ]);
    });

    it('serializes error rows to a downloadable CSV string', () => {
        const output = unparseErrorCSV([{
            name: 'Alice',
            email: 'bad@example.com',
            error: 'Invalid email, "quote"'
        }]);

        expect(output).toContain('"name","email","error"');
        expect(output).toContain('"Alice","bad@example.com","Invalid email, ""quote"""');
    });
});
