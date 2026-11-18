import assert from 'node:assert/strict';
import { describe, it } from 'vitest';
import { labels, snippets } from '../../src/admin/index.ts';
import type { LabelRecord, SnippetRecord, SnippetsBrowseResponse } from '../../src/admin/index.ts';

const ID = '5951f5fca366002ebd5dbef7';
const DATE = '2026-11-16T10:00:00.000Z';
const meta = {
  pagination: { page: 1, limit: 15, pages: 1, total: 1, next: null, prev: null },
};

const label = { id: ID, name: 'VIP', slug: 'vip', created_at: DATE, updated_at: DATE };
const snippet = { id: ID, name: 'Intro', created_at: DATE, updated_at: null };

describe('labels responses', function () {
  it('accepts browse and single envelopes', function () {
    assert.ok(labels.responses.browse.safeParse({ labels: [label], meta }).success);
    assert.ok(labels.responses.read.safeParse({ labels: [label] }).success);
    assert.ok(
      labels.responses.edit.safeParse({ labels: [{ ...label, updated_at: null }] }).success,
    );
  });

  it('rejects unknown fields, so serializer drift fails', function () {
    assert.ok(!labels.responses.read.safeParse({ labels: [{ ...label, extra: 1 }] }).success);
    assert.ok(!labels.responses.read.safeParse({ labels: [label], meta }).success);
    assert.ok(!labels.responses.browse.safeParse({ labels: [label] }).success);
  });

  it('only allows the member count when it was included', function () {
    const counted = { ...label, count: { members: 3 } };
    assert.ok(!labels.responses.read.safeParse({ labels: [counted] }).success);
    assert.ok(labels.responsesWithMemberCount.read.safeParse({ labels: [counted] }).success);
    assert.ok(!labels.responsesWithMemberCount.read.safeParse({ labels: [label] }).success);

    assert.equal(labels.responsesFor({}), labels.responses);
    assert.equal(
      labels.responsesFor(labels.browse.options.parse({ include: 'count.members' })),
      labels.responsesWithMemberCount,
    );
  });

  it('infers the record type', function () {
    const record: LabelRecord = labels.record.parse(label);
    assert.equal(record.slug, 'vip');
  });
});

describe('snippets responses', function () {
  it('returns mobiledoc by default', function () {
    const body = { snippets: [{ ...snippet, mobiledoc: '{}' }] };
    assert.ok(snippets.responses.read.safeParse(body).success);
    assert.ok(snippets.responsesFor({}).read.safeParse(body).success);
    assert.ok(!snippets.responsesFor({ formats: ['lexical'] }).read.safeParse(body).success);
  });

  it('returns only the requested formats, with lexical nullable', function () {
    const lexical = snippets.responsesFor({ formats: ['lexical'] });
    assert.ok(lexical.read.safeParse({ snippets: [{ ...snippet, lexical: null }] }).success);
    assert.ok(!lexical.read.safeParse({ snippets: [snippet] }).success);

    const both = snippets.responsesFor({ formats: ['mobiledoc', 'lexical'] });
    const body: SnippetsBrowseResponse<'mobiledoc' | 'lexical'> = {
      snippets: [{ ...snippet, mobiledoc: '{}', lexical: '{}' }],
      meta,
    };
    assert.ok(both.browse.safeParse(body).success);
    assert.ok(
      !snippets.responses.read.safeParse({ snippets: [{ ...snippet, mobiledoc: null }] }).success,
    );
  });

  it('builds records from parsed request options', function () {
    const request = snippets.read.options.parse({ id: ID, formats: 'lexical,mobiledoc' });
    const record: SnippetRecord<'lexical' | 'mobiledoc'> = snippets
      .recordFor(request.formats ?? [])
      .parse({ ...snippet, mobiledoc: '{}', lexical: null });
    assert.equal(record.lexical, null);
  });
});
