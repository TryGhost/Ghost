// @vitest-environment jsdom

import {fireEvent, render, screen, waitFor} from '@testing-library/react';
import {beforeEach, describe, expect, it, vi} from 'vitest';
import MediaLibrary from './media-library';

const {addFolderMutation, editMediaMutation, mockUseAddMediaFolder, mockUseBrowseMedia, mockUseBrowseMediaFolders, mockUseEditMedia, mockUseUploadMediaFile, uploadMutation} = vi.hoisted(() => {
    const uploadMutation = {
        isLoading: false,
        mutateAsync: vi.fn()
    };
    const addFolderMutation = {
        isLoading: false,
        mutateAsync: vi.fn()
    };
    const editMediaMutation = {
        mutateAsync: vi.fn()
    };

    return {
        addFolderMutation,
        editMediaMutation,
        mockUseAddMediaFolder: vi.fn(() => addFolderMutation),
        mockUseBrowseMedia: vi.fn(),
        mockUseBrowseMediaFolders: vi.fn(),
        mockUseEditMedia: vi.fn(() => editMediaMutation),
        mockUseUploadMediaFile: vi.fn(() => uploadMutation),
        uploadMutation
    };
});

vi.mock('@tryghost/admin-x-framework/api/media', () => ({
    useAddMediaFolder: mockUseAddMediaFolder,
    useBrowseMedia: mockUseBrowseMedia,
    useBrowseMediaFolders: mockUseBrowseMediaFolders,
    useEditMedia: mockUseEditMedia,
    useUploadMediaFile: mockUseUploadMediaFile
}));

let clipboardWriteText: ReturnType<typeof vi.fn>;

const mediaItem = {
    id: 'media-id',
    url: 'https://example.com/content/images/2026/05/hero.jpg',
    folder_id: null,
    storage_path: '2026/05/hero.jpg',
    storage_type: 'images',
    media_type: 'image',
    mime_type: 'image/jpeg',
    extension: 'jpg',
    name: 'hero.jpg',
    size_bytes: 2048,
    width: 1200,
    height: 800,
    thumbnail_url: null,
    source: 'upload',
    created_by: null,
    created_at: '2026-05-01T00:00:00.000Z',
    updated_at: '2026-05-01T00:00:00.000Z',
    usages: [{
        id: 'usage-id',
        media_file_id: 'media-id',
        resource_type: 'post',
        resource_id: 'post-id',
        field: 'feature_image',
        created_at: '2026-05-01T00:00:00.000Z'
    }]
};

describe('MediaLibrary', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        clipboardWriteText = vi.fn();
        Object.assign(navigator, {
            clipboard: {
                writeText: clipboardWriteText
            }
        });

        mockUseBrowseMedia.mockReturnValue({
            data: {
                media: [mediaItem],
                meta: {
                    pagination: {
                        page: 1,
                        limit: 30,
                        pages: 1,
                        total: 1,
                        next: null,
                        prev: null
                    }
                }
            },
            isError: false,
            isFetching: false,
            isLoading: false,
            refetch: vi.fn()
        });
        mockUseBrowseMediaFolders.mockReturnValue({
            data: {
                media_folders: [{
                    id: 'folder-id',
                    name: 'Brand',
                    slug: 'brand',
                    created_by: null,
                    created_at: '2026-05-01T00:00:00.000Z',
                    updated_at: '2026-05-01T00:00:00.000Z'
                }]
            }
        });
        addFolderMutation.mutateAsync.mockResolvedValue({
            media_folders: [{
                id: 'new-folder-id',
                name: 'New folder',
                slug: 'new-folder',
                created_by: null,
                created_at: '2026-05-01T00:00:00.000Z',
                updated_at: '2026-05-01T00:00:00.000Z'
            }]
        });
        editMediaMutation.mutateAsync.mockResolvedValue({});
    });

    it('renders the media library grid', () => {
        render(<MediaLibrary />);

        expect(screen.getByRole('heading', {name: /Media library/})).toBeInTheDocument();
        expect(screen.getByText('hero.jpg')).toBeInTheDocument();
        expect(screen.getByText(/JPG/)).toBeInTheDocument();
    });

    it('opens details and copies the media URL', async () => {
        render(<MediaLibrary />);

        fireEvent.click(screen.getByRole('button', {name: /hero.jpg/i}));
        expect(screen.getByText('Media file details and usage.')).toBeInTheDocument();
        expect(screen.getByText('feature_image · post-id')).toBeInTheDocument();

        fireEvent.click(screen.getByRole('button', {name: 'Copy URL'}));

        await waitFor(() => {
            expect(clipboardWriteText).toHaveBeenCalledWith(mediaItem.url);
        });
        expect(screen.getByRole('button', {name: 'Copied'})).toBeInTheDocument();
    });

    it('updates browse params when searching', async () => {
        render(<MediaLibrary />);

        fireEvent.change(screen.getByLabelText('Search media'), {
            target: {value: 'hero'}
        });

        await waitFor(() => {
            const lastCall = mockUseBrowseMedia.mock.calls.at(-1)?.[0] as {searchParams: {search?: string}};
            expect(lastCall.searchParams.search).toBe('hero');
        });
    });

    it('uploads selected files and refreshes the library', async () => {
        const refetch = vi.fn();
        mockUseBrowseMedia.mockReturnValue({
            data: {media: [], meta: {pagination: {page: 1, limit: 30, pages: 0, total: 0, next: null, prev: null}}},
            isError: false,
            isFetching: false,
            isLoading: false,
            refetch
        });
        uploadMutation.mutateAsync.mockResolvedValue({});

        const {container} = render(<MediaLibrary />);
        const input = container.querySelector('input[type="file"]') as HTMLInputElement;

        fireEvent.change(input, {
            target: {
                files: [new File(['hero'], 'hero.jpg', {type: 'image/jpeg'})]
            }
        });

        await waitFor(() => {
            const uploadArg = uploadMutation.mutateAsync.mock.calls[0]?.[0] as {file: File; folderId?: string | null};
            expect(uploadArg.file.name).toBe('hero.jpg');
            expect(uploadArg.folderId).toBeNull();
            expect(refetch).toHaveBeenCalled();
        });
    });

    it('renders the empty state', () => {
        mockUseBrowseMedia.mockReturnValue({
            data: {media: [], meta: {pagination: {page: 1, limit: 30, pages: 0, total: 0, next: null, prev: null}}},
            isError: false,
            isFetching: false,
            isLoading: false,
            refetch: vi.fn()
        });

        render(<MediaLibrary />);

        expect(screen.getByText('No media found')).toBeInTheDocument();
    });
});
