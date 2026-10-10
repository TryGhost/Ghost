import { describe, expect, it } from 'vitest';
import {
  dispatchSimpleNodes,
  getFieldKeysByType,
  hasFieldKey,
  parseFilterToAst,
  serializePredicates,
} from './filter-query-core';
import { getCompoundChildren } from './filter-ast';
import { columnAddressing, composeCodec } from './filter-addressing';
import { numberSemantics, scalarSemantics } from './semantics';

const scalarCodec = (config?: { field?: string }) =>
  composeCodec(columnAddressing(config), scalarSemantics());
const numberCodec = (config?: { field?: string }) =>
  composeCodec(columnAddressing(config), numberSemantics());
const defineFields = <T extends Record<string, FilterField>>(fields: T): T => fields;
import type { AstNode } from './filter-ast';
import type { FilterField, FilterPredicate } from './filter-types';

function ast(filter: string): AstNode {
  const node = parseFilterToAst(filter);

  if (!node) {
    throw new Error(`could not parse: ${filter}`);
  }

  return node;
}

function compound(filter: string): AstNode[] {
  const children = getCompoundChildren(ast(filter), '$and');

  if (!children) {
    throw new Error(`not a compound: ${filter}`);
  }

  return children;
}

const fields = defineFields({
  status: {
    operators: ['is', 'is-not'],
    ui: {
      label: 'Status',
      type: 'select',
    },
    codec: scalarCodec(),
  },
  email_count: {
    operators: ['is', 'is-greater', 'is-or-less'],
    ui: {
      label: 'Email count',
      type: 'number',
    },
    codec: numberCodec(),
  },
  'newsletters.:slug': {
    operators: ['is', 'is-not'],
    ui: {
      label: 'Newsletter',
      type: 'select',
    },
    codec: scalarCodec(),
  },
  author: {
    operators: ['is', 'is-not'],
    parseKeys: ['member_id'],
    ui: {
      label: 'Author',
      type: 'select',
    },
    codec: scalarCodec({ field: 'member_id' }),
  },
  created_at: {
    operators: ['is-or-less'],
    parseKeys: ['created_at_utc'],
    ui: {
      label: 'Created',
      type: 'date',
    },
    codec: scalarCodec({ field: 'created_at_utc' }),
  },
});

describe('filter-query-core', () => {
  it('parses NQL into a traversable AST for surface-level composition', () => {
    expect(getCompoundChildren(ast('status:paid+email_count:>5'), '$and')).toEqual([
      { status: 'paid' },
      { email_count: { $gt: 5 } },
    ]);
  });

  it('returns undefined for malformed NQL', () => {
    expect(parseFilterToAst('status:(')).toBeUndefined();
  });

  it('dispatches simple nodes into parsed predicates', () => {
    const children = compound('status:paid+email_count:>5');
    const predicates = dispatchSimpleNodes(children, fields, 'UTC');

    expect(predicates).toEqual([
      { field: 'status', operator: 'is', values: ['paid'] },
      { field: 'email_count', operator: 'is-greater', values: [5] },
    ]);
  });

  it('skips unknown simple nodes', () => {
    const children = compound('status:paid+unknown:test');
    const predicates = dispatchSimpleNodes(children, fields, 'UTC');

    expect(predicates).toEqual([{ field: 'status', operator: 'is', values: ['paid'] }]);
  });

  it('dispatches through declared parse aliases when the AST field name differs', () => {
    const node = ast('member_id:abc123');
    const predicates = dispatchSimpleNodes([node], fields, 'UTC');

    expect(predicates).toEqual([{ field: 'author', operator: 'is', values: ['abc123'] }]);
  });

  it('serializes predicates through resolved fields and drops unresolved ones', () => {
    const predicates: FilterPredicate[] = [
      { id: '1', field: 'status', operator: 'is', values: ['paid'] },
      { id: '2', field: 'newsletters.weekly', operator: 'is-not', values: ['inactive'] },
      { id: '3', field: 'unknown', operator: 'is', values: ['test'] },
    ];

    expect(serializePredicates(predicates, fields, 'UTC')).toBe(
      'newsletters.weekly:-inactive+status:paid',
    );
  });

  it('round-trips simple predicates canonically', () => {
    const children = compound('status:paid+email_count:>5');
    const parsed = dispatchSimpleNodes(children, fields, 'UTC').map((predicate, index) => ({
      ...predicate,
      id: String(index + 1),
    }));

    expect(serializePredicates(parsed, fields, 'UTC')).toBe('email_count:>5+status:paid');
  });

  it('finds fields by UI type and declared parse aliases in nested AST nodes', () => {
    const node = ast("(status:paid,created_at_utc:<'2024-01-01T00:00:00.000Z')");
    const fieldKeys = getFieldKeysByType(fields, 'date');

    expect([...fieldKeys]).toEqual(['created_at', 'created_at_utc']);
    expect(hasFieldKey(node, fieldKeys)).toBe(true);
  });
});
