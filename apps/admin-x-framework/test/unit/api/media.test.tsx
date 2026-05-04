import {QueryClient, QueryClientProvider} from '@tanstack/react-query';
import {act, renderHook, waitFor} from '@testing-library/react';
import React, {ReactNode} from 'react';
import {useBrowseMedia, useReadMedia, useUploadMediaFile} from '../../../src/api/media';
import {FrameworkProvider} from '../../../src/providers/framework-provider';
import {withMockFetch} from '../../utils/mock-fetch';

vi.mock('../../../src/api/current-user', () => ({
    useCurrentUser: vi.fn().mockReturnValue({
        data: {
            id: '1',
            name: 'Test User',
            roles: [{name: 'Administrator', id: '1'}]
        }
    })
}));

const createWrapper = () => {
    const queryClient = new QueryClient({
        defaultOptions: {
            queries: {
                retry: false
            },
            mutations: {
                retry: false
            }
        }
    });

    const wrapper: React.FC<{children: ReactNode}> = ({children}) => (
        <FrameworkProvider
            externalNavigate={() => {}}
            ghostVersion='5.x'
            sentryDSN=''
            unsplashConfig={{
                Authorization: '',
                'Accept-Version': '',
                'Content-Type': '',
                'App-Pragma': '',
                'X-Unsplash-Cache': true
            }}
            onDelete={() => {}}
            onInvalidate={() => {}}
            onUpdate={() => {}}
        >
            <QueryClientProvider client={queryClient}>
                {children}
            </QueryClientProvider>
        </FrameworkProvider>
    );

    return {wrapper, queryClient};
};

describe('media API hooks', () => {
    it('browses media with search params', async () => {
        const {wrapper, queryClient} = createWrapper();

        await withMockFetch({
            json: {media: [], meta: {pagination: {page: 1, limit: 30, pages: 0, total: 0, next: null, prev: null}}}
        }, async (mock) => {
            const {result} = renderHook(() => useBrowseMedia({
                searchParams: {
                    limit: '30',
                    search: 'hero',
                    filter: 'media_type:image',
                    order: 'created_at desc'
                }
            }), {wrapper});

            await waitFor(() => expect(result.current.isLoading).toBe(false));

            expect(result.current.data?.media).toEqual([]);
            expect(mock.calls[0][0]).toBe('http://localhost:3000/ghost/api/admin/media/?limit=30&search=hero&filter=media_type%3Aimage&order=created_at+desc');
        });

        queryClient.clear();
    });

    it('reads a media file by id', async () => {
        const {wrapper, queryClient} = createWrapper();

        await withMockFetch({
            json: {media: [{id: 'media-id', name: 'hero.jpg'}]}
        }, async (mock) => {
            const {result} = renderHook(() => useReadMedia('media-id'), {wrapper});

            await waitFor(() => expect(result.current.isLoading).toBe(false));

            expect(result.current.data?.media[0].id).toBe('media-id');
            expect(mock.calls[0][0]).toBe('http://localhost:3000/ghost/api/admin/media/media-id/');
        });

        queryClient.clear();
    });

    it('chooses the image upload endpoint for image files', async () => {
        const {wrapper, queryClient} = createWrapper();

        await withMockFetch({
            json: {images: [{url: 'http://localhost:3000/content/images/2026/05/hero.jpg', ref: null}]}
        }, async (mock) => {
            const {result} = renderHook(() => useUploadMediaFile(), {wrapper});

            await act(async () => {
                await result.current.mutateAsync({
                    file: new File(['image'], 'hero.jpg', {type: 'image/jpeg'})
                });
            });

            expect(mock.calls[0][0]).toBe('http://localhost:3000/ghost/api/admin/images/upload/');
            expect(mock.calls[0][1].method).toBe('POST');
            expect(mock.calls[0][1].body).toBeInstanceOf(FormData);
        });

        queryClient.clear();
    });

    it('chooses media and files upload endpoints by file type', async () => {
        const {wrapper, queryClient} = createWrapper();

        await withMockFetch({
            json: {media: [{url: 'http://localhost:3000/content/media/2026/05/video.mp4', ref: null}]}
        }, async (mock) => {
            const {result} = renderHook(() => useUploadMediaFile(), {wrapper});

            await act(async () => {
                await result.current.mutateAsync({
                    file: new File(['video'], 'video.mp4', {type: 'video/mp4'})
                });
            });

            await act(async () => {
                await result.current.mutateAsync({
                    file: new File(['pdf'], 'report.pdf', {type: 'application/pdf'})
                });
            });

            expect(mock.calls[0][0]).toBe('http://localhost:3000/ghost/api/admin/media/upload/');
            expect(mock.calls[1][0]).toBe('http://localhost:3000/ghost/api/admin/files/upload/');
        });

        queryClient.clear();
    });
});
