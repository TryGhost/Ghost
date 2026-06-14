import assert from 'node:assert/strict';
import {MediaLibrary} from '@src/components/settings/site/media-library-modal';
import {beforeEach, describe, it, vi} from 'vitest';
import {render, screen} from '@testing-library/react';

// The Upload button is the editor's escape hatch to the native file dialog. It
// must appear only when the library is opened with an upload handler (from the
// editor/Koenig), and never in the Settings browser, which is read-only manage
// mode. These tests pin that to both the populated footer and the empty state.

const {useBrowseMediaLibrary} = vi.hoisted(() => ({useBrowseMediaLibrary: vi.fn()}));

vi.mock('@tryghost/admin-x-framework/api/media-library', () => ({useBrowseMediaLibrary}));

const ITEMS = [
    {url: 'https://example.com/content/images/pic.jpg', type: 'image', filename: 'pic.jpg', count: 1, used_in: []}
];

const mockLibrary = (items: typeof ITEMS) => useBrowseMediaLibrary.mockReturnValue({
    data: {media_library: items},
    isLoading: false,
    isError: false,
    refetch: vi.fn()
});

const uploadButton = () => screen.queryByRole('button', {name: /upload/i});

describe('MediaLibrary upload button visibility', function () {
    beforeEach(function () {
        useBrowseMediaLibrary.mockReset();
    });

    describe('opened from the editor (onUpload provided)', function () {
        it('shows the upload button in the footer when there is media', function () {
            mockLibrary(ITEMS);
            render(<MediaLibrary onClose={vi.fn()} onUpload={vi.fn()} />);
            assert.notEqual(uploadButton(), null);
        });

        it('shows the upload button in the empty state when there is no media', function () {
            mockLibrary([]);
            render(<MediaLibrary onClose={vi.fn()} onUpload={vi.fn()} />);
            assert.equal(screen.queryByText('Your media will appear here') !== null, true);
            assert.notEqual(uploadButton(), null);
        });
    });

    describe('opened from Settings (no onUpload, read-only manage mode)', function () {
        it('never shows the upload button when there is media', function () {
            mockLibrary(ITEMS);
            render(<MediaLibrary onClose={vi.fn()} />);
            assert.equal(uploadButton(), null);
        });

        it('never shows the upload button in the empty state', function () {
            mockLibrary([]);
            render(<MediaLibrary onClose={vi.fn()} />);
            assert.equal(screen.queryByText('Your media will appear here') !== null, true);
            assert.equal(uploadButton(), null);
        });
    });
});
