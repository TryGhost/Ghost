import { MemoryRouter, useSearchParams } from 'react-router';
import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import {
  shouldDelayMembersFilterHydration,
  useMembersFilterState,
} from './use-members-filter-state';
import type { ReactNode } from 'react';

vi.mock('@tryghost/admin-x-framework/api/settings', () => ({
  useBrowseSettings: () => ({
    data: { settings: [{ key: 'timezone', value: 'UTC' }] },
  }),
}));

function createWrapper(initialEntry: string) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <MemoryRouter initialEntries={[initialEntry]}>{children}</MemoryRouter>;
  };
}

describe('shouldDelayMembersFilterHydration', () => {
  const DATE_FILTER = "created_at:<='2024-02-01T22:59:59.999Z'";
  const resolved = {
    hasResolvedSettings: true,
    isLoadingSettings: false,
    newsletters: [],
    customFields: [],
  };

  it('waits for the timezone when the filter says a date', () => {
    expect(
      shouldDelayMembersFilterHydration(DATE_FILTER, {
        ...resolved,
        hasResolvedSettings: false,
        isLoadingSettings: true,
      }),
    ).toBe(true);
  });

  it('does not wait for the timezone when no date is named', () => {
    expect(
      shouldDelayMembersFilterHydration('status:paid,label:vip', {
        ...resolved,
        hasResolvedSettings: false,
        isLoadingSettings: true,
      }),
    ).toBe(false);
  });

  it('does not wait once the site timezone is resolved', () => {
    expect(shouldDelayMembersFilterHydration(DATE_FILTER, resolved)).toBe(false);
  });

  it('waits for the definitions a filter names, and only those', () => {
    // A custom field can only be read for what it holds once the site says what it holds, so
    // the page waits rather than reading it as text and answering a wider question.
    const customFieldFilter = "(metafields.key:'custom.joined'+metafields.value:<'2024-01-01')";

    expect(
      shouldDelayMembersFilterHydration(customFieldFilter, {
        ...resolved,
        customFields: undefined,
      }),
    ).toBe(true);
    expect(shouldDelayMembersFilterHydration(customFieldFilter, resolved)).toBe(false);

    expect(
      shouldDelayMembersFilterHydration('(newsletters.slug:weekly+email_disabled:0)', {
        ...resolved,
        newsletters: undefined,
      }),
    ).toBe(true);
    expect(
      shouldDelayMembersFilterHydration('status:paid', {
        ...resolved,
        newsletters: undefined,
        customFields: undefined,
      }),
    ).toBe(false);
  });

  it('does not wait for a source only a quoted value mentions', () => {
    expect(
      shouldDelayMembersFilterHydration("name:~'metafields.'", {
        ...resolved,
        customFields: undefined,
      }),
    ).toBe(false);
  });

  it('does not wait for definitions that are never coming', () => {
    // An empty list means nothing is on its way, so waiting would never end.
    const customFieldFilter = "(metafields.key:'custom.company'+metafields.value:'Ghost')";

    expect(
      shouldDelayMembersFilterHydration(customFieldFilter, { ...resolved, customFields: [] }),
    ).toBe(false);
    expect(
      shouldDelayMembersFilterHydration('(newsletters.slug:weekly+email_disabled:0)', {
        ...resolved,
        newsletters: [],
      }),
    ).toBe(false);
  });

  it('does not wait when there is no filter at all', () => {
    expect(
      shouldDelayMembersFilterHydration(undefined, {
        ...resolved,
        newsletters: undefined,
        customFields: undefined,
      }),
    ).toBe(false);
  });
});

describe('useMembersFilterState', () => {
  it('drops unsupported OR filters and rewrites the URL canonically', async () => {
    const { result } = renderHook(
      () => {
        const state = useMembersFilterState('UTC');
        const [searchParams] = useSearchParams();

        return {
          ...state,
          query: searchParams.toString(),
        };
      },
      {
        wrapper: createWrapper('/?filter=status:paid,label:vip'),
      },
    );

    await waitFor(() => {
      expect(result.current.query).toBe('');
    });

    expect(result.current.filters).toEqual([]);
    expect(result.current.nql).toBeUndefined();
    expect(result.current.hasFilterOrSearch).toBe(false);
  });

  it('parses the multiple active Stripe customers filter into a predicate', async () => {
    const { result } = renderHook(
      () => {
        const state = useMembersFilterState('UTC');
        const [searchParams] = useSearchParams();

        return {
          ...state,
          query: searchParams.toString(),
        };
      },
      {
        wrapper: createWrapper('/?filter=count.active_stripe_customers%3A%3E1'),
      },
    );

    await waitFor(() => {
      expect(result.current.nql).toBe('count.active_stripe_customers:>1');
    });

    expect(result.current.filters).toEqual([
      {
        id: 'count.active_stripe_customers:1',
        field: 'count.active_stripe_customers',
        operator: 'is',
        values: ['true'],
      },
    ]);
    expect(result.current.query).toBe('filter=count.active_stripe_customers%3A%3E1');
    expect(result.current.hasFilterOrSearch).toBe(true);
  });

  it('parses the inverted multiple active Stripe customers filter into a predicate', async () => {
    const { result } = renderHook(
      () => {
        const state = useMembersFilterState('UTC');
        const [searchParams] = useSearchParams();

        return {
          ...state,
          query: searchParams.toString(),
        };
      },
      {
        wrapper: createWrapper('/?filter=count.active_stripe_customers%3A%3C2'),
      },
    );

    await waitFor(() => {
      expect(result.current.nql).toBe('count.active_stripe_customers:<2');
    });

    expect(result.current.filters).toEqual([
      {
        id: 'count.active_stripe_customers:1',
        field: 'count.active_stripe_customers',
        operator: 'is',
        values: ['false'],
      },
    ]);
    expect(result.current.query).toBe('filter=count.active_stripe_customers%3A%3C2');
    expect(result.current.hasFilterOrSearch).toBe(true);
  });

  it('drops unsupported multiple active Stripe customers filter values', async () => {
    const { result } = renderHook(
      () => {
        const state = useMembersFilterState('UTC');
        const [searchParams] = useSearchParams();

        return {
          ...state,
          query: searchParams.toString(),
        };
      },
      {
        wrapper: createWrapper('/?filter=count.active_stripe_customers%3A%3E2'),
      },
    );

    await waitFor(() => {
      expect(result.current.query).toBe('');
    });

    expect(result.current.filters).toEqual([]);
    expect(result.current.nql).toBeUndefined();
    expect(result.current.hasFilterOrSearch).toBe(false);
  });

  it('retains supported filters and rewrites mixed URLs canonically', async () => {
    const { result } = renderHook(
      () => {
        const state = useMembersFilterState('UTC');
        const [searchParams] = useSearchParams();

        return {
          ...state,
          query: searchParams.toString(),
        };
      },
      {
        wrapper: createWrapper(
          '/?filter=(status:paid,label:vip)%2Bcreated_at%3A%3C%3D%272024-02-01T23%3A59%3A59.999Z%27',
        ),
      },
    );

    await waitFor(() => {
      expect(result.current.nql).toBe("created_at:<='2024-02-01T23:59:59.999Z'");
    });

    expect(
      result.current.filters.map(({ field, operator, values }) => ({ field, operator, values })),
    ).toEqual([{ field: 'created_at', operator: 'is-or-less', values: ['2024-02-01'] }]);
    expect(result.current.nql).toBe("created_at:<='2024-02-01T23:59:59.999Z'");
    expect(result.current.hasFilterOrSearch).toBe(true);
    expect(result.current.query).toBe(
      'filter=created_at%3A%3C%3D%272024-02-01T23%3A59%3A59.999Z%27',
    );
  });

  it('reads Ember-style filter params and keeps search separate', () => {
    const { result } = renderHook(() => useMembersFilterState('UTC'), {
      wrapper: createWrapper('/?filter=status:paid&search=jamie'),
    });

    expect(result.current.filters).toEqual([
      {
        id: 'status:1',
        field: 'status',
        operator: 'is',
        values: ['paid'],
      },
    ]);
    expect(result.current.search).toBe('jamie');
    expect(result.current.hasFilterOrSearch).toBe(true);
  });

  it('writes canonical Ember filter params', () => {
    const { result } = renderHook(
      () => {
        const state = useMembersFilterState('UTC');
        const [searchParams] = useSearchParams();

        return {
          ...state,
          query: searchParams.toString(),
        };
      },
      { wrapper: createWrapper('/') },
    );

    act(() => {
      result.current.setFilters(
        [
          {
            id: '1',
            field: 'emails.post_id',
            operator: 'is',
            values: ['post_123'],
          },
          {
            id: '2',
            field: 'status',
            operator: 'is',
            values: ['paid'],
          },
        ],
        { replace: false },
      );
    });

    expect(result.current.query).toBe('filter=emails.post_id%3A%27post_123%27%2Bstatus%3Apaid');
  });

  it('preserves search when clearing filters', () => {
    const { result } = renderHook(
      () => {
        const state = useMembersFilterState('UTC');
        const [searchParams] = useSearchParams();

        return {
          ...state,
          query: searchParams.toString(),
        };
      },
      { wrapper: createWrapper('/?filter=status:paid&search=jamie') },
    );

    act(() => {
      result.current.clearFilters({ replace: false });
    });

    expect(result.current.query).toBe('search=jamie');
    expect(result.current.filters).toEqual([]);
    expect(result.current.search).toBe('jamie');
  });

  it('writes search params without clearing existing filters', () => {
    const { result } = renderHook(
      () => {
        const state = useMembersFilterState('UTC');
        const [searchParams] = useSearchParams();

        return {
          ...state,
          query: searchParams.toString(),
        };
      },
      { wrapper: createWrapper('/?filter=status:paid') },
    );

    act(() => {
      result.current.setSearch('jamie@example.com', { replace: false });
    });

    expect(result.current.query).toBe('filter=status%3Apaid&search=jamie%40example.com');
    expect(result.current.filters).toEqual([
      {
        id: 'status:1',
        field: 'status',
        operator: 'is',
        values: ['paid'],
      },
    ]);
    expect(result.current.search).toBe('jamie@example.com');
  });

  it('keeps incomplete text filters locally while preserving serializable filters in the URL', () => {
    const { result } = renderHook(
      () => {
        const state = useMembersFilterState('UTC');
        const [searchParams] = useSearchParams();

        return {
          ...state,
          query: searchParams.toString(),
        };
      },
      { wrapper: createWrapper('/?filter=label:vip') },
    );

    act(() => {
      result.current.setFilters(
        [
          ...result.current.filters,
          {
            id: 'name:2',
            field: 'name',
            operator: 'is',
            values: [''],
          },
        ],
        { replace: false },
      );
    });

    expect(result.current.query).toBe('filter=label%3A%5Bvip%5D');
    expect(result.current.nql).toBe('label:[vip]');
    expect(result.current.filters).toEqual([
      {
        id: 'label:1',
        field: 'label',
        operator: 'is-any',
        values: ['vip'],
      },
      {
        id: 'name:2',
        field: 'name',
        operator: 'is',
        values: [''],
      },
    ]);
  });

  it('can clear both filters and search for empty-state reset flows', () => {
    const { result } = renderHook(
      () => {
        const state = useMembersFilterState('UTC');
        const [searchParams] = useSearchParams();

        return {
          ...state,
          query: searchParams.toString(),
        };
      },
      { wrapper: createWrapper('/?filter=status:paid&search=jamie') },
    );

    act(() => {
      result.current.clearAll({ replace: false });
    });

    expect(result.current.query).toBe('');
    expect(result.current.filters).toEqual([]);
    expect(result.current.search).toBe('');
    expect(result.current.hasFilterOrSearch).toBe(false);
  });
});

describe('useMembersFilterState — once its sources have arrived', () => {
  const CUSTOM_FIELD_FILTER = "(metafields.key:'custom.company'+metafields.value:'Ghost')";

  function renderWithSources(sources: {
    newsletters?: { slug: string; name: string }[];
    customFields?: { key: string; name: string; type: 'short_text' }[];
  }) {
    return renderHook(
      () => {
        const state = useMembersFilterState('UTC', sources.newsletters, sources.customFields);
        const [searchParams] = useSearchParams();

        return { ...state, query: searchParams.toString() };
      },
      {
        wrapper: createWrapper(`/?filter=${encodeURIComponent(CUSTOM_FIELD_FILTER)}`),
      },
    );
  }

  it('reads and writes normally once they have', async () => {
    const { result } = renderWithSources({
      customFields: [{ key: 'company', name: 'Company', type: 'short_text' }],
    });

    await waitFor(() => {
      expect(result.current.filters).toHaveLength(1);
    });

    expect(result.current.filters[0].field).toBe('metafields.custom.company');
    expect(result.current.nql).toBe(CUSTOM_FIELD_FILTER);
    expect(decodeURIComponent(result.current.query)).toContain("metafields.key:'custom.company'");
  });
});
