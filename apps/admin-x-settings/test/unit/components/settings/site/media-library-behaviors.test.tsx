import assert from 'node:assert/strict';
import {MediaLibrary} from '@src/components/settings/site/media-library-modal';
import {beforeEach, describe, it, vi} from 'vitest';
import {fireEvent, render, screen} from '@testing-library/react';

// Behaviour coverage for the shared library component: grid + usage rendering,
// the load-error state (which must not look empty), client-side search, and
// single-select insertion. The type lock and upload-button visibility live in
// sibling files.

const {useBrowseMediaLibrary} = vi.hoisted(() => ({useBrowseMediaLibrary: vi.fn()}));

vi.mock('@tryghost/admin-x-framework/api/media-library', () => ({useBrowseMediaLibrary}));

const ITEMS = [
    {
        url: 'https://example.com/content/images/pic.jpg',
        type: 'image',
        filename: 'pic.jpg',
        count: 2,
        used_in: [{type: 'post', id: '1', title: 'First post', status: 'published', fields: ['feature_image']}]
    },
    {url: 'https://example.com/content/media/clip.mp4', type: 'media', filename: 'clip.mp4', count: 1, used_in: []}
];

const mockLibrary = (overrides = {}) => useBrowseMediaLibrary.mockReturnValue({
    data: {media_library: ITEMS},
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
    ...overrides
});

describe('MediaLibrary behaviours', function () {
    beforeEach(function () {
        useBrowseMediaLibrary.mockReset();
    });

    it('renders the grid with each item and its usage count', function () {
        mockLibrary();
        render(<MediaLibrary onClose={vi.fn()} />);

        assert.notEqual(screen.queryByText('pic.jpg'), null);
        assert.notEqual(screen.queryByText('clip.mp4'), null);
        assert.notEqual(screen.queryByText((_, el) => el?.textContent === 'Used in 2 places'), null);
    });

    it('shows an error state, not an empty library, when the load fails', function () {
        mockLibrary({data: undefined, isError: true});
        render(<MediaLibrary onClose={vi.fn()} />);

        assert.notEqual(screen.queryByText('Couldn\'t load your media library'), null);
        assert.equal(screen.queryByText('pic.jpg'), null);
    });

    it('filters the grid as you search', function () {
        mockLibrary();
        render(<MediaLibrary onClose={vi.fn()} />);

        fireEvent.change(screen.getByLabelText('Search media'), {target: {value: 'pic'}});

        assert.notEqual(screen.queryByText('pic.jpg'), null);
        assert.equal(screen.queryByText('clip.mp4'), null);
    });

    it('inserts a single item and closes when picked', function () {
        mockLibrary({data: {media_library: [ITEMS[0]]}});
        const onInsert = vi.fn();
        const onClose = vi.fn();
        render(<MediaLibrary selection={{onInsert}} onClose={onClose} />);

        fireEvent.click(screen.getByRole('button', {name: 'Insert'}));

        assert.equal(onInsert.mock.calls.length, 1);
        assert.deepEqual(onInsert.mock.calls[0][0], [ITEMS[0]]);
        assert.equal(onClose.mock.calls.length, 1);
    });
});
