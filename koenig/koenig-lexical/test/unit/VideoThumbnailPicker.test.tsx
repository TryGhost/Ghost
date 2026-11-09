import {LOAD_TIMEOUT_MS, canvasToJpeg} from '../../src/utils/videoFrames';
import {VideoThumbnailPicker} from '../../src/components/ui/VideoThumbnailPicker';
import {act, fireEvent, render, screen} from '@testing-library/react';
import {afterEach, beforeEach, expect, vi} from 'vitest';

// jsdom plays no video: the strip never loads, and the picked frame can't be encoded, as when a
// frame really can't be saved
vi.mock(import('../../src/utils/videoFrames'), async (importOriginal) => {
    const actual = await importOriginal();
    return {
        ...actual,
        loadVideo: vi.fn(() => new Promise<void>(() => {})),
        releaseVideo: vi.fn(),
        drawFrame: vi.fn(() => document.createElement('canvas')),
        canvasToJpeg: vi.fn(() => Promise.reject(new Error('The frame could not be encoded')))
    };
});

/** The preview as if its video had loaded. */
function loadPreview({duration = 4} = {}) {
    const preview = screen.getByTestId('thumbnail-preview');
    Object.defineProperties(preview, {
        videoWidth: {value: 1920},
        videoHeight: {value: 1080},
        duration: {value: duration},
        readyState: {value: 4}
    });
    fireEvent.loadedMetadata(preview);
}

function renderPicker(props = {}) {
    return render(
        <VideoThumbnailPicker
            thumbnail="/content/images/2026/10/video_thumb.jpg"
            videoSrc="/content/media/2026/10/video.mp4"
            isOpen
            onClose={vi.fn()}
            onSelectFrame={vi.fn()}
            onUploadImage={vi.fn()}
            {...props}
        />
    );
}

describe('VideoThumbnailPicker', function () {
    beforeEach(() => {
        vi.spyOn(HTMLMediaElement.prototype, 'load').mockImplementation(() => {});
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('says when the picked frame can\'t be saved, until the writer moves on', async function () {
        const onSelectFrame = vi.fn();
        renderPicker({onSelectFrame});
        loadPreview();

        fireEvent.click(screen.getByRole('button', {name: 'Select'}));

        expect(await screen.findByRole('alert')).toHaveTextContent('This frame couldn\'t be saved. Try again, or upload an image.');
        expect(onSelectFrame).not.toHaveBeenCalled();
        expect(screen.getByRole('button', {name: 'Select'})).toBeEnabled();

        fireEvent.change(screen.getByRole('slider', {name: 'Thumbnail frame'}), {target: {value: '2'}});
        expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });

    it('marks Select busy, rather than disabling it, while the frame is saved', async function () {
        vi.mocked(canvasToJpeg).mockImplementationOnce(() => new Promise<Blob>(() => {}));
        renderPicker();
        loadPreview();

        const select = screen.getByRole('button', {name: 'Select'});
        select.focus();
        fireEvent.click(select);

        expect(select).toHaveAttribute('aria-disabled', 'true');
        expect(select).not.toBeDisabled();
    });

    it('offers only an image for a video with no length to scrub', function () {
        renderPicker();
        loadPreview({duration: Infinity});

        expect(screen.getByTestId('thumbnail-unreadable')).toBeInTheDocument();
        expect(screen.getByRole('img', {name: 'Current thumbnail'})).toBeInTheDocument();
        expect(screen.queryByRole('slider', {name: 'Thumbnail frame'})).not.toBeInTheDocument();
        expect(screen.queryByRole('button', {name: 'Select'})).not.toBeInTheDocument();
        expect(screen.getByRole('status')).toHaveTextContent('This video\'s frames couldn\'t be loaded');
    });

    it('offers only an image when the video never loads', function () {
        vi.useFakeTimers();
        try {
            renderPicker();
            expect(screen.queryByTestId('thumbnail-unreadable')).not.toBeInTheDocument();

            act(() => {
                vi.advanceTimersByTime(LOAD_TIMEOUT_MS);
            });

            expect(screen.getByTestId('thumbnail-unreadable')).toBeInTheDocument();
        } finally {
            vi.useRealTimers();
        }
    });
});
