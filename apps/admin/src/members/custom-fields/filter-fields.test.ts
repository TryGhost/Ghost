import { describe, expect, it } from 'vitest';
import { SCALAR_KIND_FILTER_TYPE, customFieldDescriptor, partFilterType } from './filter-fields';
import { FILTER_TYPES } from '@/shared/filters';
import { MEMBER_CUSTOM_FIELD_KINDS } from '@tryghost/admin-x-framework/api/member-custom-fields';
import type {
  MemberCustomFieldKind,
  MemberCustomFieldPartType,
} from '@tryghost/admin-x-framework/api/member-custom-fields';
import type { FieldDescriptor, FilterTypeId } from '@/shared/filters';

type ScalarKind = Exclude<MemberCustomFieldKind, 'record'>;

// Compile-time assertions: this file is type-checked by `tsc -b`, so each expected
// error going away fails the build.
// @ts-expect-error -- must not compile, or SCALAR_KIND_FILTER_TYPE is no longer exhaustive
const _mappingWithAMissingKindDoesNotCompile: { [K in ScalarKind]: FilterTypeId } = {
  text: 'text',
  date: 'plain_date',
};
const _mappingWithAnUnknownKindDoesNotCompile: { [K in ScalarKind]: FilterTypeId } = {
  ...SCALAR_KIND_FILTER_TYPE,
  // @ts-expect-error -- must not compile, or SCALAR_KIND_FILTER_TYPE accepts undeclared kinds
  boolean: 'scalar',
};
void _mappingWithAMissingKindDoesNotCompile;
void _mappingWithAnUnknownKindDoesNotCompile;

describe('SCALAR_KIND_FILTER_TYPE', () => {
  it('maps every scalar kind the shared catalog declares', () => {
    const scalarKinds = MEMBER_CUSTOM_FIELD_KINDS.filter((kind) => kind !== 'record');
    expect(Object.keys(SCALAR_KIND_FILTER_TYPE).sort()).toEqual([...scalarKinds].sort());
  });
});

describe('a composite field descriptor', () => {
  const descriptor = customFieldDescriptor({
    namespace: 'custom',
    key: 'shipping',
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

// @ts-expect-error -- must not compile, or PART_FILTER_TYPE is no longer exhaustive
const _partMappingWithAMissingTypeDoesNotCompile: {
  [P in MemberCustomFieldPartType]: 'text' | 'set';
} = {
  short_text: 'text',
  postal_code: 'text',
};
void _partMappingWithAMissingTypeDoesNotCompile;

describe('partFilterType', () => {
  it('types a part from a list as a set and a typed part as text', () => {
    expect(partFilterType('address', 'country')).toBe('set');
    expect(partFilterType('address', 'city')).toBe('text');
    expect(partFilterType('address', '')).toBeUndefined();
  });
});
