import { describe, expect, it } from 'vitest';
import { customFieldDescriptor, partFilterType } from './filter-fields';
import { FILTER_TYPES } from '@/shared/filters';
import type { FieldDescriptor } from '@/shared/filters';
import { CUSTOM_NAMESPACE, KeySchema } from '@tryghost/metafield-types/identity';

describe('a composite field descriptor', () => {
  const descriptor = customFieldDescriptor({
    namespace: CUSTOM_NAMESPACE,
    key: KeySchema.parse('shipping'),
    name: 'Shipping',
    type: 'address',
  });

  it('reads its parts with their own types combined and starts the whole field at presence', () => {
    expect(descriptor.type).toBeUndefined();
    expect(descriptor.operators).toEqual([
      ...FILTER_TYPES.text.operators,
      ...FILTER_TYPES.set.operators,
      'is-set',
      'is-not-set',
    ]);
    expect(descriptor.ui.defaultOperator).toBe('is-set');
  });

  it('serializes each operator through the type that owns it', () => {
    const ctx = { key: 'metafields.custom.shipping', pattern: '', params: {}, timezone: 'UTC' };
    const semantics = describeSemantics(descriptor);

    expect(semantics.serialize({ operator: 'contains', values: ['Lon'] }, ctx)).toBe("~'Lon'");
    expect(semantics.serialize({ operator: 'is-any', values: ['GB', 'DE'] }, ctx)).toBe(
      "['DE','GB']",
    );
    expect(semantics.serialize({ operator: 'is-greater', values: ['1'] }, ctx)).toBeNull();
  });

  it('parses a plain string as text and only a list as a set', () => {
    const ctx = { key: 'metafields.custom.shipping', pattern: '', params: {}, timezone: 'UTC' };
    const semantics = describeSemantics(descriptor);

    expect(semantics.parse({ operator: '$eq', value: 'GB' }, ctx)).toEqual({
      operator: 'is',
      values: ['GB'],
    });
    expect(semantics.parse({ operator: '$in', value: ['GB', 'DE'] }, ctx)).toEqual({
      operator: 'is-any',
      values: ['GB', 'DE'],
    });
    expect(semantics.parse({ operator: '$nin', value: ['GB'] }, ctx)).toEqual({
      operator: 'is-not-any',
      values: ['GB'],
    });
  });
});

function describeSemantics(field: FieldDescriptor) {
  if (field.type !== undefined) {
    throw new Error('expected a domain field carrying its own semantics');
  }
  return field.semantics;
}

describe('partFilterType', () => {
  it('types a part from a list as a set and a typed part as text', () => {
    expect(partFilterType('address', 'country')).toBe('set');
    expect(partFilterType('address', 'city')).toBe('text');
    expect(partFilterType('address', '')).toBeUndefined();
  });
});
