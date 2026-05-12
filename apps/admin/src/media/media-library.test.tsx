// @vitest-environment jsdom

import {act, fireEvent, render, screen, waitFor} from '@testing-library/react';
import {beforeEach, describe, expect, it, vi} from 'vitest';
import MediaLibrary from './media-library';

type MockPinturaConfig = {
    jsUrl: string;
    cssUrl: string;
} | null;

const {mockNavigate, mockRouteListeners, mockRouteState, mockUsePinturaConfig} = vi.hoisted(() => ({
    mockNavigate: vi.fn(),
    mockRouteListeners: new Set<() => void>(),
    mockRouteState: {
        folderSlug: '',
        mediaId: '',
        pathname: '/media'
    },
    mockUsePinturaConfig: vi.fn<() => MockPinturaConfig>(() => null)
}));

const {addFolderMutation, deleteMediaFileMutation, editMediaMutation, mockUseAddMediaFolder, mockUseBrowseMedia, mockUseBrowseMediaFolders, mockUseDeleteMediaFile, mockUseEditMedia, mockUseReadMedia, mockUseReplaceMediaFile, mockUseUploadMediaFile, replaceMediaFileMutation, uploadMutation} = vi.hoisted(() => {
    const uploadMutation = {
        isLoading: false,
        mutateAsync: vi.fn()
    };
    const deleteMediaFileMutation = {
        isLoading: false,
        mutateAsync: vi.fn()
    };
    const replaceMediaFileMutation = {
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
        deleteMediaFileMutation,
        editMediaMutation,
        mockUseAddMediaFolder: vi.fn(() => addFolderMutation),
        mockUseBrowseMedia: vi.fn(),
        mockUseBrowseMediaFolders: vi.fn(),
        mockUseDeleteMediaFile: vi.fn(() => deleteMediaFileMutation),
        mockUseEditMedia: vi.fn(() => editMediaMutation),
        mockUseReadMedia: vi.fn(),
        mockUseReplaceMediaFile: vi.fn(() => replaceMediaFileMutation),
        mockUseUploadMediaFile: vi.fn(() => uploadMutation),
        replaceMediaFileMutation,
        uploadMutation
    };
});

vi.mock('@tryghost/admin-x-framework', async () => {
    const React = await import('react');
    const parseMediaRoute = (to: string) => {
        const [path] = to.split('?');
        const parts = path.replace(/^\/+/, '').split('/').filter(Boolean);
        const isEditing = parts.at(-1) === 'edit';
        const routeParts = isEditing ? parts.slice(0, -1) : parts;

        if (routeParts[0] !== 'media') {
            return {folderSlug: '', mediaId: ''};
        }

        if (isEditing && routeParts.length === 2) {
            return {
                folderSlug: '',
                mediaId: routeParts[1] ? decodeURIComponent(routeParts[1]) : ''
            };
        }

        if (routeParts.length > 2) {
            return {
                folderSlug: routeParts[1] ? decodeURIComponent(routeParts[1]) : '',
                mediaId: routeParts[2] ? decodeURIComponent(routeParts[2]) : ''
            };
        }

        return {
            folderSlug: routeParts[1] ? decodeURIComponent(routeParts[1]) : '',
            mediaId: ''
        };
    };

    return {
        useNavigate: () => (to: string | number, options?: object) => {
            mockNavigate(to, options);
            if (typeof to === 'number') {
                return;
            }

            const route = parseMediaRoute(to);
            mockRouteState.pathname = to;
            mockRouteState.folderSlug = route.folderSlug;
            mockRouteState.mediaId = route.mediaId;
            mockRouteListeners.forEach(listener => listener());
        },
        useLocation: () => {
            const [, forceUpdate] = React.useReducer((value: number) => value + 1, 0);

            React.useEffect(() => {
                mockRouteListeners.add(forceUpdate);

                return () => {
                    mockRouteListeners.delete(forceUpdate);
                };
            }, []);

            return {
                pathname: mockRouteState.pathname,
                search: '',
                hash: '',
                state: null,
                key: 'default'
            };
        },
        useParams: () => {
            const [, forceUpdate] = React.useReducer((value: number) => value + 1, 0);

            React.useEffect(() => {
                mockRouteListeners.add(forceUpdate);

                return () => {
                    mockRouteListeners.delete(forceUpdate);
                };
            }, []);

            return {
                ...(mockRouteState.folderSlug ? {folderSlug: mockRouteState.folderSlug} : {}),
                ...(mockRouteState.mediaId ? {mediaId: mockRouteState.mediaId} : {})
            };
        }
    };
});

vi.mock('@tryghost/admin-x-framework/api/media', () => ({
    useAddMediaFolder: mockUseAddMediaFolder,
    useBrowseMedia: mockUseBrowseMedia,
    useBrowseMediaFolders: mockUseBrowseMediaFolders,
    useDeleteMediaFile: mockUseDeleteMediaFile,
    useEditMedia: mockUseEditMedia,
    useReadMedia: mockUseReadMedia,
    useReplaceMediaFile: mockUseReplaceMediaFile,
    useUploadMediaFile: mockUseUploadMediaFile
}));

vi.mock('@tryghost/admin-x-framework/hooks', () => ({
    usePinturaConfig: mockUsePinturaConfig
}));

let clipboardWriteText: ReturnType<typeof vi.fn>;

type MockPinturaEditor = {
    close: ReturnType<typeof vi.fn>;
    destroy: ReturnType<typeof vi.fn>;
    handlers: Record<string, (result?: unknown) => void>;
    imageState: Record<string, unknown>;
    on: ReturnType<typeof vi.fn>;
};

const installPinturaMock = () => {
    const editors: MockPinturaEditor[] = [];
    const openDefaultEditor = vi.fn(() => {
        const handlers: Record<string, (result?: unknown) => void> = {};
        const editor: MockPinturaEditor = {
            close: vi.fn(() => {
                handlers.hide?.();
            }),
            destroy: vi.fn(),
            handlers,
            imageState: {},
            on: vi.fn((event: string, callback: (result?: unknown) => void) => {
                handlers[event] = callback;
            })
        };

        editors.push(editor);
        return editor;
    });
    const cssUrl = 'https://cdn.example.com/pintura.css';
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = cssUrl;
    link.dataset.testid = 'pintura-css';
    document.head.appendChild(link);

    mockUsePinturaConfig.mockReturnValue({
        jsUrl: 'https://cdn.example.com/pintura.js',
        cssUrl
    });
    (window as unknown as {pintura?: {openDefaultEditor: typeof openDefaultEditor}}).pintura = {openDefaultEditor};

    return {editors, openDefaultEditor};
};

const renderMediaLibrary = (initialEntry = '/media') => {
    const [path] = initialEntry.split('?');
    const parts = path.replace(/^\/+/, '').split('/').filter(Boolean);
    const isEditing = parts.at(-1) === 'edit';
    const routeParts = isEditing ? parts.slice(0, -1) : parts;

    mockRouteState.pathname = path;

    if (isEditing && routeParts.length === 2) {
        mockRouteState.folderSlug = '';
        mockRouteState.mediaId = routeParts[1] ? decodeURIComponent(routeParts[1]) : '';
    } else if (routeParts.length > 2) {
        mockRouteState.folderSlug = routeParts[1] ? decodeURIComponent(routeParts[1]) : '';
        mockRouteState.mediaId = routeParts[2] ? decodeURIComponent(routeParts[2]) : '';
    } else {
        mockRouteState.folderSlug = routeParts[1] ? decodeURIComponent(routeParts[1]) : '';
        mockRouteState.mediaId = '';
    }

    return render(<MediaLibrary />);
};

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
    alt_text: null,
    caption: null,
    size_bytes: 2048,
    width: 1200,
    height: 800,
    thumbnail_url: null,
    source: 'upload',
    visibility: 'library',
    created_by: null,
    created_at: '2026-05-01T00:00:00.000Z',
    updated_at: '2026-05-01T00:00:00.000Z'
};

const mediaItemWithUsages = {
    ...mediaItem,
    usages: [{
        id: 'usage-id',
        media_file_id: 'media-id',
        resource_type: 'post',
        resource_id: 'post-id',
        field: 'feature_image',
        created_at: '2026-05-01T00:00:00.000Z',
        resource: {
            id: 'post-id',
            type: 'post',
            title: 'Cats rule the world',
            slug: 'cats-rule-the-world',
            status: 'published',
            editor_url: '/editor/post/post-id'
        }
    }]
};

const videoItem = {
    ...mediaItem,
    id: 'video-id',
    url: 'https://example.com/content/media/2026/05/clip.mp4',
    storage_path: '2026/05/clip.mp4',
    storage_type: 'media',
    media_type: 'video',
    mime_type: 'video/mp4',
    extension: 'mp4',
    name: 'clip.mp4',
    size_bytes: 817152,
    width: null,
    height: null
};

const pdfItem = {
    ...mediaItem,
    id: 'pdf-id',
    url: 'https://example.com/content/files/2026/05/report.pdf',
    storage_path: '2026/05/report.pdf',
    storage_type: 'files',
    media_type: 'file',
    mime_type: 'application/pdf',
    extension: 'pdf',
    name: 'report.pdf',
    size_bytes: 42000,
    width: null,
    height: null
};

describe('MediaLibrary', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockUsePinturaConfig.mockReturnValue(null);
        delete (window as unknown as {pintura?: unknown}).pintura;
        document.head.querySelectorAll('link[data-testid="pintura-css"]').forEach(link => link.remove());
        Element.prototype.scrollIntoView = vi.fn();
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
        mockUseReadMedia.mockImplementation((id: string) => ({
            data: id ? {media: [id === videoItem.id ? videoItem : id === pdfItem.id ? pdfItem : mediaItemWithUsages]} : undefined,
            isError: false,
            isFetching: false,
            isLoading: false,
            refetch: vi.fn()
        }));
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
        deleteMediaFileMutation.mutateAsync.mockResolvedValue({});
        replaceMediaFileMutation.mutateAsync.mockResolvedValue({});
    });

    it('renders the media library grid', () => {
        renderMediaLibrary();

        expect(screen.getByRole('heading', {name: /Media library/})).toBeInTheDocument();
        expect(screen.getByText('hero')).toBeInTheDocument();
        expect(screen.getByText(/JPG/)).toBeInTheDocument();
    });

    it('opens details and copies the media URL', async () => {
        renderMediaLibrary();

        fireEvent.click(screen.getByRole('button', {name: /hero/i}));
        expect(mockNavigate).toHaveBeenCalledWith('/media/media-id', undefined);
        expect(screen.getByText('Media file details and usage.')).toBeInTheDocument();
        expect(screen.getByText('Cats rule the world')).toBeInTheDocument();
        expect(screen.getByText('Post')).toBeInTheDocument();

        fireEvent.click(screen.getByRole('button', {name: 'Copy'}));

        await waitFor(() => {
            expect(clipboardWriteText).toHaveBeenCalledWith(mediaItem.url);
        });
        expect(screen.getByRole('button', {name: 'Copied'})).toBeInTheDocument();

        fireEvent.click(screen.getByRole('button', {name: /Cats rule the world/i}));

        expect(mockNavigate).toHaveBeenLastCalledWith('/editor/post/post-id', {crossApp: true});
    });

    it('blocks deleting media with tracked usage', async () => {
        renderMediaLibrary();

        fireEvent.click(screen.getByRole('button', {name: /hero/i}));
        fireEvent.click(screen.getByRole('button', {name: 'Delete file'}));

        expect(await screen.findByText('File is in use')).toBeInTheDocument();
        expect(screen.getByText(/cannot be deleted while it has tracked usage/i)).toBeInTheDocument();
        expect(deleteMediaFileMutation.mutateAsync).not.toHaveBeenCalled();
    });

    it('deletes media without tracked usage and closes the viewer', async () => {
        const refetch = vi.fn();
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
            refetch
        });
        mockUseReadMedia.mockImplementation((id: string) => ({
            data: id ? {media: [{...mediaItem, usages: []}]} : undefined,
            isError: false,
            isFetching: false,
            isLoading: false,
            refetch: vi.fn()
        }));

        renderMediaLibrary();

        fireEvent.click(screen.getByRole('button', {name: /hero/i}));
        fireEvent.click(screen.getByRole('button', {name: 'Delete file'}));
        fireEvent.click(await screen.findByRole('button', {name: 'Delete'}));

        await waitFor(() => {
            expect(deleteMediaFileMutation.mutateAsync).toHaveBeenCalledWith('media-id');
            expect(refetch).toHaveBeenCalled();
        });
        expect(mockNavigate).toHaveBeenLastCalledWith('/media', undefined);
    });

    it('opens media details from a viewer route', () => {
        renderMediaLibrary('/media/media-id');

        expect(mockUseReadMedia).toHaveBeenCalledWith('media-id', expect.objectContaining({enabled: true}));
        expect(screen.getByText('Media file details and usage.')).toBeInTheDocument();
        expect(screen.getByText('Cats rule the world')).toBeInTheDocument();
    });

    it('opens media details from a single-segment viewer route when no folders exist', () => {
        mockUseBrowseMediaFolders.mockReturnValue({
            data: {
                media_folders: []
            }
        });

        renderMediaLibrary('/media/media-id');

        expect(mockUseReadMedia).toHaveBeenCalledWith('media-id', expect.objectContaining({enabled: true}));
        expect(screen.getByText('Media file details and usage.')).toBeInTheDocument();
        expect(screen.getByText('Cats rule the world')).toBeInTheDocument();
    });

    it('closes media details when pressing escape', async () => {
        renderMediaLibrary('/media/media-id');

        fireEvent.keyDown(document, {key: 'Escape'});

        await waitFor(() => {
            expect(mockNavigate).toHaveBeenLastCalledWith('/media', undefined);
        });
    });

    it('opens media details from an editor route', () => {
        renderMediaLibrary('/media/media-id/edit');

        expect(mockUseReadMedia).toHaveBeenCalledWith('media-id', expect.objectContaining({enabled: true}));
        expect(screen.getByText('Media file details and usage.')).toBeInTheDocument();
        expect(screen.getByText('Cats rule the world')).toBeInTheDocument();
    });

    it('cleans up the Pintura editor when an editor route unmounts', async () => {
        const {editors, openDefaultEditor} = installPinturaMock();
        const {unmount} = renderMediaLibrary('/media/media-id/edit');

        await waitFor(() => {
            expect(openDefaultEditor).toHaveBeenCalledTimes(1);
        });

        unmount();

        expect(editors[0].close).toHaveBeenCalled();
        expect(editors[0].destroy).toHaveBeenCalled();
    });

    it('closes the Pintura editor from a direct editor route without closing the media viewer', async () => {
        const {editors, openDefaultEditor} = installPinturaMock();
        renderMediaLibrary('/media/media-id/edit');

        await waitFor(() => {
            expect(openDefaultEditor).toHaveBeenCalledTimes(1);
        });

        act(() => {
            editors[0].handlers.hide?.();
        });

        await waitFor(() => {
            expect(mockNavigate).toHaveBeenLastCalledWith('/media/media-id', {replace: true});
        });
        expect(screen.getByText('Media file details and usage.')).toBeInTheDocument();
    });

    it('preserves the active folder when opening and closing media details', async () => {
        renderMediaLibrary('/media/brand');

        fireEvent.click(screen.getByRole('button', {name: /hero/i}));
        expect(mockNavigate).toHaveBeenCalledWith('/media/brand/media-id', undefined);

        fireEvent.click(screen.getByRole('button', {name: 'Close media details'}));

        await waitFor(() => {
            expect(mockNavigate).toHaveBeenLastCalledWith('/media/brand', undefined);
        });
    });

    it('renders video thumbnails and opens videos with playback controls', () => {
        mockUseBrowseMedia.mockReturnValue({
            data: {
                media: [videoItem],
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

        const {container} = renderMediaLibrary();

        const thumbnail = container.querySelector('button video');
        expect(thumbnail).toBeInTheDocument();
        expect(thumbnail).not.toHaveAttribute('controls');

        fireEvent.click(screen.getByRole('button', {name: /clip/i}));

        const player = screen.getByLabelText('Play clip');
        expect(player).toBeInTheDocument();
        expect(player).toHaveAttribute('controls');
        expect(player).toHaveAttribute('autoplay');
        expect((player as HTMLVideoElement).muted).toBe(true);
        expect(player.getAttribute('src')).toContain(videoItem.url);
    });

    it('hides alt text for non-image media and does not save it', async () => {
        editMediaMutation.mutateAsync.mockResolvedValue({
            media: [{
                ...pdfItem,
                name: 'renamed',
                caption: 'A PDF caption'
            }]
        });
        mockUseBrowseMedia.mockReturnValue({
            data: {
                media: [pdfItem],
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

        renderMediaLibrary();

        fireEvent.click(screen.getByRole('button', {name: /report/i}));

        expect(screen.getByTitle('PDF preview: report')).toHaveAttribute('src', expect.stringContaining(pdfItem.url));
        expect(screen.queryByLabelText('Alt text')).not.toBeInTheDocument();

        fireEvent.change(screen.getByLabelText('Display name'), {
            target: {value: 'renamed.pdf'}
        });
        fireEvent.change(screen.getByLabelText('Caption'), {
            target: {value: 'A PDF caption'}
        });
        fireEvent.click(screen.getByRole('button', {name: 'Done'}));

        await waitFor(() => {
            expect(editMediaMutation.mutateAsync).toHaveBeenCalledWith({
                id: 'pdf-id',
                name: 'renamed',
                caption: 'A PDF caption'
            });
        });
    });

    it('saves edited media metadata from the details modal', async () => {
        editMediaMutation.mutateAsync.mockResolvedValue({
            media: [{
                ...mediaItem,
                name: 'renamed',
                alt_text: 'A useful description',
                caption: 'A visible caption'
            }]
        });

        renderMediaLibrary();

        fireEvent.click(screen.getByRole('button', {name: /hero/i}));
        expect(screen.getByRole('button', {name: 'Done'})).toBeEnabled();
        fireEvent.change(screen.getByLabelText('Display name'), {
            target: {value: 'renamed.jpg'}
        });
        fireEvent.change(screen.getByLabelText('Alt text'), {
            target: {value: 'A useful description'}
        });
        fireEvent.change(screen.getByLabelText('Caption'), {
            target: {value: 'A visible caption'}
        });
        fireEvent.click(screen.getByRole('button', {name: 'Done'}));

        await waitFor(() => {
            expect(editMediaMutation.mutateAsync).toHaveBeenCalledWith({
                id: 'media-id',
                name: 'renamed',
                alt_text: 'A useful description',
                caption: 'A visible caption'
            });
        });
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('keeps metadata edits local until saved', () => {
        renderMediaLibrary();

        fireEvent.click(screen.getByRole('button', {name: /hero/i}));
        fireEvent.change(screen.getByLabelText('Display name'), {
            target: {value: 'discarded.jpg'}
        });

        expect(screen.getByDisplayValue('discarded.jpg')).toBeInTheDocument();
        expect(editMediaMutation.mutateAsync).not.toHaveBeenCalled();
    });

    it('assigns and removes a media folder from the details modal', async () => {
        renderMediaLibrary();

        fireEvent.click(screen.getByRole('button', {name: /hero/i}));
        fireEvent.focus(screen.getByLabelText('Folder'));
        fireEvent.click(screen.getByRole('option', {name: 'Brand'}));

        await waitFor(() => {
            expect(editMediaMutation.mutateAsync).toHaveBeenCalledWith({
                id: 'media-id',
                folder_id: 'folder-id'
            });
        });

        fireEvent.click((await screen.findAllByText('Brand'))[0]);

        await waitFor(() => {
            expect(editMediaMutation.mutateAsync).toHaveBeenLastCalledWith({
                id: 'media-id',
                folder_id: null
            });
        });
    });

    it('creates and assigns a media folder from the details modal', async () => {
        renderMediaLibrary();

        fireEvent.click(screen.getByRole('button', {name: /hero/i}));
        fireEvent.focus(screen.getByLabelText('Folder'));
        fireEvent.change(screen.getByLabelText('Folder'), {
            target: {value: 'Campaign'}
        });
        fireEvent.click(screen.getByRole('option', {name: 'Create "Campaign"'}));

        await waitFor(() => {
            expect(addFolderMutation.mutateAsync).toHaveBeenCalledWith({name: 'Campaign'});
            expect(editMediaMutation.mutateAsync).toHaveBeenCalledWith({
                id: 'media-id',
                folder_id: 'new-folder-id'
            });
        });
    });

    it('updates browse params when searching', async () => {
        renderMediaLibrary();

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

        const {container} = renderMediaLibrary();
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

    it('switches to a newly created folder and closes the folder menu', async () => {
        renderMediaLibrary();

        fireEvent.pointerDown(screen.getByRole('button', {name: /^All$/}));
        fireEvent.click(screen.getByText('Create folder'));
        fireEvent.change(screen.getByPlaceholderText('Folder name'), {
            target: {value: 'New folder'}
        });
        fireEvent.click(screen.getByRole('button', {name: 'Create'}));

        await waitFor(() => {
            expect(addFolderMutation.mutateAsync).toHaveBeenCalledWith({name: 'New folder'});
            expect(mockNavigate).toHaveBeenLastCalledWith('/media/new-folder', undefined);
        });
        expect(screen.queryByPlaceholderText('Folder name')).not.toBeInTheDocument();
    });

    it('uploads selected files to the active folder', async () => {
        uploadMutation.mutateAsync.mockResolvedValue({});

        const {container} = renderMediaLibrary('/media/brand');

        await waitFor(() => {
            const lastCall = mockUseBrowseMedia.mock.calls.at(-1)?.[0] as {searchParams: {filter?: string}};
            expect(lastCall.searchParams.filter).toBe('folder_id:folder-id');
        });

        const input = container.querySelector('input[type="file"]') as HTMLInputElement;
        fireEvent.change(input, {
            target: {
                files: [new File(['brand'], 'brand.png', {type: 'image/png'})]
            }
        });

        await waitFor(() => {
            const uploadArg = uploadMutation.mutateAsync.mock.calls[0]?.[0] as {file: File; folderId?: string | null};
            expect(uploadArg.file.name).toBe('brand.png');
            expect(uploadArg.folderId).toBe('folder-id');
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

        renderMediaLibrary();

        expect(screen.getByText('No media found')).toBeInTheDocument();
    });
});
