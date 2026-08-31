import { describe, expect, it, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useMemberFilterSources } from './use-member-filter-sources';

const BIRTHDAY = { key: 'birthday', name: 'Birthday', type: 'short_text', status: 'active' };

const mocks = vi.hoisted(() => ({
  definitionsFailed: false,
}));

vi.mock('@tryghost/admin-x-framework/api/newsletters', () => ({
  useBrowseNewsletters: () => ({ data: undefined, isError: false }),
}));

vi.mock('@/shared/member-custom-fields/use-definitions', () => ({
  useCustomFieldDefinitionsIncludingArchived: () => ({
    data: mocks.definitionsFailed ? undefined : { members_custom_fields: [BIRTHDAY] },
    isError: mocks.definitionsFailed,
  }),
}));

describe('useMemberFilterSources custom fields', () => {
  it('serves the definitions when no filter names a custom field', () => {
    mocks.definitionsFailed = false;
    const { result } = renderHook(() => useMemberFilterSources(undefined));

    expect(result.current.customFields).toEqual([BIRTHDAY]);
  });

  it('serves an empty list when the definitions cannot be fetched', () => {
    mocks.definitionsFailed = true;
    const { result } = renderHook(() => useMemberFilterSources("custom_fields.birthday:'x'"));

    expect(result.current.customFields).toEqual([]);
  });
});
