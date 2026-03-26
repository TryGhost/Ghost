import {HttpResponse, http} from 'msw';
import {QueryClient} from '@tanstack/react-query';
import {act, waitFor} from '@testing-library/react';
import {beforeEach, describe, expect, it} from 'vitest';
import {renderHookWithProviders} from '@tryghost/admin-x-framework/test/test-utils';
import {server} from '../../utils/msw-helpers';
import {useLabelPicker} from '@src/hooks/use-label-picker';
import {useState} from 'react';
import type {Label} from '@tryghost/admin-x-framework/api/labels';

// --- Helpers ---

function makeLabel(overrides: Partial<Label> = {}): Label {
    return {
        id: '1',
        name: 'Label One',
        slug: 'label-one',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        ...overrides
    };
}

function labelsResponse(labels: Label[]) {
    return {
        labels,
        meta: {
            pagination: {
                page: 1,
                limit: 100,
                pages: 1,
                total: labels.length,
                next: null,
                prev: null
            }
        }
    };
}

/** Wrapper hook that manages selectedSlugs state internally, like a real component would */
function useWrappedPicker(initialSlugs: string[]) {
    const [selectedSlugs, setSelectedSlugs] = useState(initialSlugs);
    const picker = useLabelPicker({selectedSlugs, onSelectionChange: setSelectedSlugs});
    return {...picker, selectedSlugs};
}

// --- Tests ---

describe('useLabelPicker', () => {
    // Mutable label store that MSW handlers read from
    let currentLabels: Label[];
    let queryClient: QueryClient;

    beforeEach(() => {
        currentLabels = [];
        queryClient = new QueryClient({
            defaultOptions: {
                queries: {retry: false, cacheTime: 0, staleTime: 0},
                mutations: {retry: false}
            },
            logger: {log: () => {}, warn: () => {}, error: () => {}}
        });

        server.use(
            http.get('/ghost/api/admin/labels/', () => HttpResponse.json(labelsResponse(currentLabels))),
            http.get('/ghost/api/admin/labels/slug/:slug/', ({params}) => {
                const label = currentLabels.find(l => l.slug === params.slug);
                if (label) {
                    return HttpResponse.json({labels: [label]});
                }
                return new HttpResponse(null, {status: 404});
            }),
            // Default PUT handler: updates name but keeps slug unchanged
            http.put('/ghost/api/admin/labels/:id/', async ({params, request}) => {
                const body = await request.json() as {labels: Partial<Label>[]};
                const existing = currentLabels.find(l => l.id === params.id);
                if (!existing) {
                    return new HttpResponse(null, {status: 404});
                }
                const updated = {...existing, ...body.labels[0]};
                currentLabels = currentLabels.map(l => (l.id === params.id ? updated : l));
                return HttpResponse.json({labels: [updated]});
            }),
            http.delete('/ghost/api/admin/labels/:id/', ({params}) => {
                currentLabels = currentLabels.filter(l => l.id !== params.id);
                return new HttpResponse(null, {status: 204});
            })
        );
    });

    describe('editing labels', () => {
        it('updates cached label name when name changes but slug stays the same', async () => {
            currentLabels = [makeLabel({id: 'abc', slug: 'my-label', name: 'Old Name'})];

            const {result} = renderHookWithProviders(
                () => useWrappedPicker(['my-label']),
                {queryClient}
            );

            await waitFor(() => {
                expect(result.current.selectedLabels[0]?.name).toBe('Old Name');
            });

            // Edit fires PUT, then invalidation refetches GET with updated data
            await act(async () => {
                await result.current.editLabel('abc', 'New Name');
            });

            await waitFor(() => {
                expect(result.current.selectedLabels[0]?.name).toBe('New Name');
            });
        });

        it('swaps selected slug when edit changes the slug', async () => {
            // Override PUT to also derive a new slug from name
            server.use(
                http.put('/ghost/api/admin/labels/:id/', async ({params, request}) => {
                    const body = await request.json() as {labels: Partial<Label>[]};
                    const existing = currentLabels.find(l => l.id === params.id);
                    if (!existing) {
                        return new HttpResponse(null, {status: 404});
                    }
                    const updated = {
                        ...existing,
                        ...body.labels[0],
                        slug: body.labels[0].name!.toLowerCase().replaceAll(/\s+/g, '-')
                    };
                    currentLabels = currentLabels.map(l => (l.id === params.id ? updated : l));
                    return HttpResponse.json({labels: [updated]});
                })
            );

            currentLabels = [makeLabel({id: 'abc', slug: 'old-slug', name: 'Old'})];

            const {result} = renderHookWithProviders(
                () => useWrappedPicker(['old-slug']),
                {queryClient}
            );

            await waitFor(() => {
                expect(result.current.selectedLabels[0]?.name).toBe('Old');
            });

            await act(async () => {
                await result.current.editLabel('abc', 'New Name');
            });

            await waitFor(() => {
                expect(result.current.selectedSlugs).toEqual(['new-name']);
            });
        });
    });

    describe('deleting labels', () => {
        it('removes deleted label from selectedSlugs', async () => {
            currentLabels = [makeLabel({id: 'abc', slug: 'doomed', name: 'Doomed'})];

            const {result} = renderHookWithProviders(
                () => useWrappedPicker(['doomed']),
                {queryClient}
            );

            await waitFor(() => {
                expect(result.current.selectedLabels[0]?.name).toBe('Doomed');
            });

            await act(async () => {
                await result.current.deleteLabel('abc');
            });

            await waitFor(() => {
                expect(result.current.selectedSlugs).toEqual([]);
                expect(result.current.selectedLabels).toEqual([]);
            });
        });

        it('preserves other selected slugs when deleting one', async () => {
            currentLabels = [
                makeLabel({id: 'a', slug: 'keep-me', name: 'Keep'}),
                makeLabel({id: 'b', slug: 'delete-me', name: 'Delete'})
            ];

            const {result} = renderHookWithProviders(
                () => useWrappedPicker(['keep-me', 'delete-me']),
                {queryClient}
            );

            await waitFor(() => {
                expect(result.current.selectedLabels).toHaveLength(2);
            });

            await act(async () => {
                await result.current.deleteLabel('b');
            });

            await waitFor(() => {
                expect(result.current.selectedSlugs).toEqual(['keep-me']);
                expect(result.current.selectedLabels).toHaveLength(1);
                expect(result.current.selectedLabels[0].name).toBe('Keep');
            });
        });
    });
});
