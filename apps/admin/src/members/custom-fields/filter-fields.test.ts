import { describe, expect, it } from 'vitest';
import { PART_FILTER_TYPE, SCALAR_KIND_FILTER_TYPE, customFieldDescriptor } from './filter-fields';
import { MEMBER_CUSTOM_FIELD_KINDS } from '@tryghost/admin-x-framework/api/member-custom-fields';
import type {
  MemberCustomFieldKind,
  MemberCustomFieldPartType,
} from '@tryghost/admin-x-framework/api/member-custom-fields';
import type { FilterTypeId } from '@/shared/filters';

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
  it('filters parts as text and starts the whole field at presence', () => {
    const descriptor = customFieldDescriptor({
      key: 'shipping',
      name: 'Shipping',
      type: 'address',
    });

    expect(descriptor.type).toBe('text');
    expect(descriptor.ui.defaultOperator).toBe('is-set');
  });
});

// @ts-expect-error -- must not compile, or PART_FILTER_TYPE is no longer exhaustive
const _partMappingWithAMissingTypeDoesNotCompile: {
  [P in MemberCustomFieldPartType]: FilterTypeId;
} = {
  short_text: 'text',
  postal_code: 'text',
};
void _partMappingWithAMissingTypeDoesNotCompile;

describe('PART_FILTER_TYPE', () => {
  it('filters every part type the same way, because a composite is read with one semantics', () => {
    expect(new Set(Object.values(PART_FILTER_TYPE)).size).toBe(1);
  });
});
