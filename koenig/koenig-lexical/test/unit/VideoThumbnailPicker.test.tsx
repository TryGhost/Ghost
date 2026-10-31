import {VideoThumbnailPicker} from '../../src/components/ui/VideoThumbnailPicker';
import {afterEach, expect, vi} from 'vitest';
import {fireEvent, render, screen} from '@testing-library/react';

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
function loadPreview() {
    const preview = screen.getByTestId('thumbnail-preview');
    Object.defineProperties(preview, {
        videoWidth: {value: 1920},
        videoHeight: {value: 1080},
        duration: {value: 4}
    });
    fireEvent.loadedMetadata(preview);
}

describe('VideoThumbnailPicker', function () {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('says when the picked frame can\'t be saved, until the writer moves on', async function () {
        vi.spyOn(HTMLMediaElement.prototype, 'load').mockImplementation(() => {});
        const onSelectFrame = vi.fn();
        render(
            <VideoThumbnailPicker
                videoSrc="/content/media/2026/10/video.mp4"
                isOpen
                onClose={vi.fn()}
                onSelectFrame={onSelectFrame}
                onUploadImage={vi.fn()}
            />
        );
        loadPreview();

        fireEvent.click(screen.getByRole('button', {name: 'Select'}));

        expect(await screen.findByRole('alert')).toHaveTextContent('This frame couldn\'t be saved. Try again, or upload an image.');
        expect(onSelectFrame).not.toHaveBeenCalled();
        expect(screen.getByRole('button', {name: 'Select'})).toBeEnabled();

        fireEvent.change(screen.getByRole('slider', {name: 'Thumbnail frame'}), {target: {value: '2'}});
        expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });
});
