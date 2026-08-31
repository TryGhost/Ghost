import { describe, expect, it } from 'vitest';
import { KIND_FILTER_TYPE } from './filter-fields';
import { MEMBER_CUSTOM_FIELD_KINDS } from '@tryghost/admin-x-framework/api/member-custom-fields';
import type { MemberCustomFieldKind } from '@tryghost/admin-x-framework/api/member-custom-fields';
import type { FilterTypeId } from '@/shared/filters';

// Compile-time assertions: this file is type-checked by `tsc -b`, so each expected
// error going away fails the build.
// @ts-expect-error -- must not compile, or KIND_FILTER_TYPE is no longer exhaustive
const _mappingWithAMissingKindDoesNotCompile: { [K in MemberCustomFieldKind]: FilterTypeId } = {
  text: 'text',
  date: 'plain_date',
  number: 'number',
};
const _mappingWithAnUnknownKindDoesNotCompile: { [K in MemberCustomFieldKind]: FilterTypeId } = {
  ...KIND_FILTER_TYPE,
  // @ts-expect-error -- must not compile, or KIND_FILTER_TYPE accepts undeclared kinds
  boolean: 'scalar',
};
void _mappingWithAMissingKindDoesNotCompile;
void _mappingWithAnUnknownKindDoesNotCompile;

describe('KIND_FILTER_TYPE', () => {
  it('maps every kind the shared catalog declares', () => {
    expect(Object.keys(KIND_FILTER_TYPE).sort()).toEqual([...MEMBER_CUSTOM_FIELD_KINDS].sort());
  });
});
