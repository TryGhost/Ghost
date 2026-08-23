import { describe, expect, it } from 'vitest';
import {
  parseCSV,
  unparseErrorCSV,
} from '@/members/components/bulk-action-modals/import-members/csv';

describe('csv helpers', () => {
  it('parses CSV rows using header keys', () => {
    const data = parseCSV('name,email\nAlice,alice@example.com');

    expect(data).toEqual([{ name: 'Alice', email: 'alice@example.com' }]);
  });

  it('handles escaped quotes and preserves quoted spaces', () => {
    const data = parseCSV('name,note\nAlice,"  hello ""friend""  "');

    expect(data).toEqual([{ name: 'Alice', note: '  hello "friend"  ' }]);
  });

  it('strips the byte order mark so the first header still matches', () => {
    const data = parseCSV('\uFEFFemail,name\nalice@example.com,Alice');

    expect(data).toEqual([{ email: 'alice@example.com', name: 'Alice' }]);
  });

  it('skips blank rows', () => {
    const data = parseCSV('name,email\nAlice,alice@example.com\n\nBob,bob@example.com\n');

    expect(data).toEqual([
      { name: 'Alice', email: 'alice@example.com' },
      { name: 'Bob', email: 'bob@example.com' },
    ]);
  });

  it('serializes error rows into the members export format', () => {
    const output = unparseErrorCSV([
      {
        name: 'Alice',
        email: 'bad@example.com',
        subscribed: true,
        labels: [{ name: 'vip' }, { name: 'gold' }],
        error: 'Invalid email, "quote"',
      },
    ]);

    expect(output).toContain(
      '"email","name","note","subscribed_to_emails","complimentary_plan","stripe_customer_id","created_at","labels","gift_id","error"',
    );
    expect(output).toContain('"vip,gold"');
    expect(output).not.toContain('[object Object]');
    expect(output).toContain('"Invalid email, ""quote"""');
  });

  it('carries the newsletters column only when the submitted file did', () => {
    const withColumn = unparseErrorCSV([
      {
        email: 'a@example.com',
        labels: [],
        newsletters: [{ name: 'Daily News' }],
        error: 'nope',
      },
    ]);
    expect(withColumn).toContain('"newsletters"');
    expect(withColumn).toContain('"Daily News"');

    const withoutColumn = unparseErrorCSV([{ email: 'a@example.com', labels: [], error: 'nope' }]);
    expect(withoutColumn.split('\n')[0]).not.toContain('newsletters');
  });
});
