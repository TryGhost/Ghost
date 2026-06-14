import assert from 'node:assert/strict';
import {MediaLibrary} from '@src/components/settings/site/media-library-modal';
import {beforeEach, describe, it, vi} from 'vitest';
import {render, screen} from '@testing-library/react';

// The picker derives an item's kind from its type/extension and, when opened for
// a single-type card, locks the grid to that kind. These tests prove that lock:
// an image card shows only images, a video card only videos, an audio card only
// audio, and the file card (and 'all') browse everything.

const {useBrowseMediaLibrary} = vi.hoisted(() => ({useBrowseMediaLibrary: vi.fn()}));

vi.mock('@tryghost/admin-x-framework/api/media-library', () => ({useBrowseMediaLibrary}));

const ITEMS = [
    {url: 'https://example.com/content/images/pic.jpg', type: 'image', filename: 'pic.jpg', count: 1, used_in: []},
    {url: 'https://example.com/content/media/clip.mp4', type: 'media', filename: 'clip.mp4', count: 1, used_in: []},
    {url: 'https://example.com/content/media/song.mp3', type: 'media', filename: 'song.mp3', count: 1, used_in: []},
    {url: 'https://example.com/content/files/doc.pdf', type: 'file', filename: 'doc.pdf', count: 1, used_in: []}
];

const renderLibrary = (cardKind?: 'all' | 'image' | 'video' | 'audio' | 'file') => render(<MediaLibrary cardKind={cardKind} onClose={vi.fn()} />);

const isShown = (filename: string) => screen.queryByText(filename) !== null;

describe('MediaLibrary type lock', function () {
    beforeEach(function () {
        useBrowseMediaLibrary.mockReturnValue({
            data: {media_library: ITEMS},
            isLoading: false,
            isError: false,
            refetch: vi.fn()
        });
    });

    it('shows only images for an image card', function () {
        renderLibrary('image');
        assert.equal(isShown('pic.jpg'), true);
        assert.equal(isShown('clip.mp4'), false);
        assert.equal(isShown('song.mp3'), false);
        assert.equal(isShown('doc.pdf'), false);
    });

    it('shows only videos for a video card', function () {
        renderLibrary('video');
        assert.equal(isShown('clip.mp4'), true);
        assert.equal(isShown('pic.jpg'), false);
        assert.equal(isShown('song.mp3'), false);
        assert.equal(isShown('doc.pdf'), false);
    });

    it('shows only audio for an audio card', function () {
        renderLibrary('audio');
        assert.equal(isShown('song.mp3'), true);
        assert.equal(isShown('clip.mp4'), false);
        assert.equal(isShown('pic.jpg'), false);
        assert.equal(isShown('doc.pdf'), false);
    });

    it('browses everything for the file card (unlocked)', function () {
        renderLibrary('file');
        assert.equal(isShown('pic.jpg'), true);
        assert.equal(isShown('clip.mp4'), true);
        assert.equal(isShown('song.mp3'), true);
        assert.equal(isShown('doc.pdf'), true);
    });

    it('browses everything when no card kind is given', function () {
        renderLibrary();
        assert.equal(isShown('pic.jpg'), true);
        assert.equal(isShown('clip.mp4'), true);
        assert.equal(isShown('song.mp3'), true);
        assert.equal(isShown('doc.pdf'), true);
    });
});
