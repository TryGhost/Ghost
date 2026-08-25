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
    expect(output.split('\n')[1]).toContain('"true"');
    expect(output).not.toContain('[object Object]');
    expect(output).toContain('"Invalid email, ""quote"""');
  });

  it('drops malformed label entries instead of crashing the download', () => {
    const output = unparseErrorCSV([
      {
        email: 'a@example.com',
        labels: [null, { name: 'vip' }, 42, { name: 'gold' }],
        error: 'nope',
      },
    ]);

    expect(output).toContain('"vip,gold"');
    expect(output).not.toContain('[object Object]');
  });

  it('escapes formula-like values before writing the downloadable CSV', () => {
    const output = unparseErrorCSV([
      {
        name: '=1+2',
        email: 'a@example.com',
        error: 'nope',
      },
    ]);

    expect(output).toContain(`"'=1+2"`);
  });

  it('keeps a column carried only by a later row, with the error column last', () => {
    const output = unparseErrorCSV([
      { email: 'a@example.com', labels: [], error: 'nope' },
      {
        email: 'b@example.com',
        labels: [],
        newsletters: [{ name: 'Daily News' }],
        'custom_fields.topic': 'ghosts',
        error: 'nope',
      },
    ]);

    const header = output.split('\n')[0].trimEnd();
    expect(header).toContain('"newsletters"');
    expect(header).toContain('"custom_fields.topic"');
    expect(header.endsWith('"error"')).toBe(true);
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
