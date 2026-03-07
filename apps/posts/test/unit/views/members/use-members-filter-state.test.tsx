import React from 'react';
import {MemoryRouter} from 'react-router';
import {renderHook} from '@testing-library/react';
import {useMembersFilterState} from '@src/views/members/hooks/use-members-filter-state';
import {vi} from 'vitest';

vi.mock('@tryghost/admin-x-framework', async () => {
    const reactRouter = await import('react-router');

    return {
        useSearchParams: reactRouter.useSearchParams
    };
});

function createWrapper(initialEntry: string) {
    return function Wrapper({children}: {children: React.ReactNode}) {
        return (
            <MemoryRouter initialEntries={[initialEntry]}>
                {children}
            </MemoryRouter>
        );
    };
}

describe('useMembersFilterState (legacy URL support)', () => {
    it('uses translated filters from legacy filter param when possible', () => {
        const wrapper = createWrapper('/members-forward?filter=label%3A%5Bblue-consultant%5D');
        const {result} = renderHook(() => useMembersFilterState(), {wrapper});

        expect(result.current.filters).toHaveLength(1);
        expect(result.current.filters[0]).toMatchObject({
            field: 'label',
            operator: 'is_any_of',
            values: ['blue-consultant']
        });
        expect(result.current.nql).toEqual('label:[blue-consultant]');
        expect(result.current.isFiltered).toBe(true);
    });

    it('falls back to raw legacy nql when translation is incomplete', () => {
        const wrapper = createWrapper('/members-forward?filter=subscriptions.start_date%3A%3E%271999-01-01%2005%3A59%3A59%27');
        const {result} = renderHook(() => useMembersFilterState(), {wrapper});

        expect(result.current.filters).toHaveLength(0);
        expect(result.current.nql).toEqual('subscriptions.start_date:>\'1999-01-01 05:59:59\'');
        expect(result.current.isFiltered).toBe(true);
    });

    it('supports legacy filterParam links', () => {
        const wrapper = createWrapper('/members-forward?filterParam=signup%3A%27post_1%27%2Bconversion%3A-%27post_1%27');
        const {result} = renderHook(() => useMembersFilterState(), {wrapper});

        expect(result.current.filters).toHaveLength(2);
        expect(result.current.nql).toEqual('signup:\'post_1\'+conversion:-\'post_1\'');
        expect(result.current.isFiltered).toBe(true);
    });

    it('preserves additional clauses for mixed subscribed expressions', () => {
        const wrapper = createWrapper('/members-forward?filter=%28subscribed%3Afalse%2Bemail_disabled%3A0%2Blabel%3A%5Bvip%5D%29');
        const {result} = renderHook(() => useMembersFilterState(), {wrapper});

        expect(result.current.nql).toContain('subscribed:false+email_disabled:0');
        expect(result.current.nql).toContain('label:[vip]');
        expect(result.current.isFiltered).toBe(true);
    });

    it('falls back to raw nql for newsletter expressions without email_disabled', () => {
        const wrapper = createWrapper('/members-forward?filter=newsletters.slug%3Aweekly');
        const {result} = renderHook(() => useMembersFilterState(), {wrapper});

        expect(result.current.filters).toHaveLength(0);
        expect(result.current.nql).toEqual('newsletters.slug:weekly');
        expect(result.current.isFiltered).toBe(true);
    });
});
