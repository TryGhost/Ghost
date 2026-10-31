import ImageIcon from '../../assets/icons/kg-card-type-image.svg?react';
import ImageUploadForm from './ImageUploadForm';
import PropTypes from 'prop-types';
import React from 'react';
import clsx from 'clsx';
import {FramesUnreadableError, canvasToJpeg, createFrameVideo, drawFrame, filmstripTimes, formatTime, loadVideo, releaseVideo, seekVideo, whenSeeked} from '../../utils/videoFrames';
import {Modal} from './Modal';
import {openFileSelection} from '../../utils/openFileSelection';

// Enough frames to find a moment at a glance, few enough to draw quickly
const FRAME_COUNT = 8;
// Each strip tile drawn at about twice its shown width
const FRAME_WIDTH = 160;
// A picked frame is saved no wider than 4K: plenty for a thumbnail, and within every browser's canvas
const MAX_SAVED_WIDTH = 3840;
// Where the card's own thumbnail comes from (extractVideoMetadata)
const START_TIME = 0.5;
// The scrubber's invisible thumb (16px), which the handle is drawn over
const THUMB_WIDTH = 16;

const button = 'rounded-md px-4 py-2 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green focus-visible:ring-offset-2 dark:focus-visible:ring-offset-black';
const secondaryButton = clsx(button, 'border border-grey-300 text-black transition-colors hover:border-grey-500 dark:border-grey-800 dark:text-white dark:hover:border-grey-600');
const primaryButton = clsx(button, 'bg-black text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-white dark:text-black');

/** A strip frame that fades in once drawn, rather than popping into its slot. */
function FilmstripFrame({src}) {
    const [isShown, setShown] = React.useState(false);

    return (
        <img
            alt=""
            className={clsx('size-full object-cover transition-opacity duration-300 ease-out motion-reduce:transition-none', isShown ? 'opacity-100' : 'opacity-0')}
            src={src}
            onLoad={() => setShown(true)}
        />
    );
}

FilmstripFrame.propTypes = {
    src: PropTypes.string
};

/**
 * Frames from across the video, drawn from a video of their own so the preview stays put. A
 * video that can't be read at all is reported; a slow one just leaves the strip unfinished.
 */
function useFilmstrip(videoSrc, onUnreadable) {
    const [frames, setFrames] = React.useState([]);
    const [isStopped, setStopped] = React.useState(false);

    React.useEffect(() => {
        if (!videoSrc) {
            return undefined;
        }
        let cancelled = false;
        const video = createFrameVideo();
        const urls = [];

        const draw = async () => {
            try {
                await loadVideo(video, videoSrc);
                if (!video.videoWidth) {
                    throw new FramesUnreadableError('The video has no picture the browser can show');
                }
                if (!Number.isFinite(video.duration) || video.duration <= 0) {
                    throw new Error('The video has no length to pick from');
                }
                for (const time of filmstripTimes(video.duration, FRAME_COUNT)) {
                    await seekVideo(video, time);
                    if (cancelled) {
                        return;
                    }
                    const frame = await canvasToJpeg(drawFrame(video, FRAME_WIDTH));
                    if (cancelled) {
                        return;
                    }
                    urls.push(URL.createObjectURL(frame));
                    setFrames([...urls]);
                }
            } catch (error) {
                if (!cancelled) {
                    setStopped(true);
                    if (error instanceof FramesUnreadableError) {
                        onUnreadable();
                    }
                }
            } finally {
                releaseVideo(video);
            }
        };
        draw();

        return () => {
            cancelled = true;
            releaseVideo(video);
            urls.forEach(url => URL.revokeObjectURL(url));
        };
    }, [videoSrc, onUnreadable]);

    return {frames, isStopped};
}

function Picker({headingId, videoSrc, videoWidth, videoHeight, thumbnail, mimeTypes, onClose, onSelectFrame, onUploadImage}) {
    const previewRef = React.useRef(null);
    const fileInputRef = React.useRef(null);
    const isOpenRef = React.useRef(false);
    const [duration, setDuration] = React.useState(0);
    const [time, setTime] = React.useState(0);
    // The card knows the video's size, so the preview keeps its shape while the video loads
    const [aspectRatio, setAspectRatio] = React.useState(videoWidth > 0 && videoHeight > 0 ? videoWidth / videoHeight : 16 / 9);
    // Found out as the video loads, so nothing is fetched until someone opens the picker
    const [isUnreadable, setUnreadable] = React.useState(false);
    const [isSelecting, setSelecting] = React.useState(false);
    // Select didn't get a frame to save (a seek that never landed, a frame that couldn't be encoded)
    const [isSelectFailed, setSelectFailed] = React.useState(false);
    const markUnreadable = React.useCallback(() => setUnreadable(true), []);
    const {frames, isStopped} = useFilmstrip(isUnreadable ? null : videoSrc, markUnreadable);
    const isLoading = !duration;
    const chooseImage = () => openFileSelection({fileInputRef});

    // Whether a frame still being saved should be used once it's ready
    React.useEffect(() => {
        isOpenRef.current = true;
        return () => {
            isOpenRef.current = false;
        };
    }, []);

    // The preview loads only what it needs, and stops when the picker closes or gives up on it
    React.useEffect(() => {
        const video = previewRef.current;
        if (!video) {
            return undefined;
        }
        if (video.getAttribute('src') !== videoSrc) {
            video.setAttribute('src', videoSrc);
        }
        // iOS Safari only loads when asked
        video.load();
        return () => releaseVideo(video);
    }, [videoSrc, isUnreadable]);

    const onPreviewLoaded = (event) => {
        const video = event.currentTarget;
        // A picture the browser can't decode (its sound may still play) has no frames to pick from
        if (!video.videoWidth) {
            markUnreadable();
            return;
        }
        const start = Math.min(START_TIME, video.duration / 2);
        setDuration(video.duration);
        setAspectRatio(video.videoWidth / video.videoHeight || 16 / 9);
        setTime(start);
        video.currentTime = start;
    };

    const onScrub = (event) => {
        const next = Number(event.target.value);
        setSelectFailed(false);
        setTime(next);
        previewRef.current.currentTime = next;
    };

    const select = async () => {
        const video = previewRef.current;
        setSelecting(true);
        setSelectFailed(false);
        try {
            if (video.seeking) {
                await whenSeeked(video);
            }
            const frame = await canvasToJpeg(drawFrame(video, Math.min(video.videoWidth, MAX_SAVED_WIDTH)));
            // Closed meanwhile: whoever closed it didn't want the frame
            if (isOpenRef.current) {
                onSelectFrame(frame);
            }
        } catch (error) {
            if (isOpenRef.current) {
                setSelecting(false);
                if (error instanceof FramesUnreadableError) {
                    setUnreadable(true);
                } else {
                    setSelectFailed(true);
                }
            }
        }
    };

    // Files picked go to the uploader as they are, as the tile's did, so it can say what it can't take
    const onFilesPicked = (event) => {
        const files = Array.from(event.target.files || []);
        if (files.length) {
            onUploadImage(files);
        }
    };

    return (
        <div className="p-8 text-left font-sans" data-testid="video-thumbnail-picker">
            <h1 className="mr-6 text-2xl font-semibold leading-snug" id={headingId}>Select thumbnail</h1>
            <p className="sr-only" role="status">{!isUnreadable && isLoading ? 'Loading the video' : ''}</p>

            {/* With no frames to pick from (a video on another domain that doesn't allow it), the thumbnail as it is */}
            {isUnreadable ? (
                <div className="mt-5 overflow-hidden rounded-md bg-black" data-testid="thumbnail-unreadable">
                    {thumbnail && <img alt="Current thumbnail" className="block max-h-[45vh] w-full object-contain" src={thumbnail} />}
                </div>
            ) : (
                <>
                    {/* A soft placeholder while it loads, then the video fades in */}
                    <div className={clsx('mt-5 overflow-hidden rounded-md', isLoading ? 'animate-pulse bg-grey-100 motion-reduce:animate-none dark:bg-grey-900' : 'bg-black')}>
                        <video
                            ref={previewRef}
                            className={clsx('block max-h-[45vh] w-full object-contain transition-opacity duration-300 ease-out motion-reduce:transition-none', isLoading ? 'opacity-0' : 'opacity-100')}
                            crossOrigin="anonymous"
                            data-testid="thumbnail-preview"
                            preload="metadata"
                            style={{aspectRatio}}
                            muted
                            playsInline
                            onError={markUnreadable}
                            onLoadedMetadata={onPreviewLoaded}
                        />
                    </div>

                    <div className="relative mt-6 h-14">
                        {/* The strip is the scrubber's track: click or drag anywhere on it, or use the arrow keys. Its invisible thumb sits under the handle, so a touch can drag it (iOS drags a range only by its thumb) */}
                        <input
                            aria-label="Thumbnail frame"
                            aria-valuetext={`${formatTime(time)} of ${formatTime(duration)}`}
                            className="peer absolute -inset-y-3 inset-x-0 z-10 cursor-pointer appearance-none opacity-0 [&::-moz-range-thumb]:h-[80px] [&::-moz-range-thumb]:w-[16px] [&::-moz-range-thumb]:border-0 [&::-webkit-slider-thumb]:h-[80px] [&::-webkit-slider-thumb]:w-[16px] [&::-webkit-slider-thumb]:appearance-none"
                            disabled={isLoading}
                            max={duration}
                            min={0}
                            step={0.1}
                            type="range"
                            value={time}
                            onChange={onScrub}
                        />
                        {/* Every frame has its slot from the start, so the strip holds its shape as they arrive */}
                        <div className="flex size-full overflow-hidden rounded-md bg-grey-100 peer-focus-visible:ring-2 peer-focus-visible:ring-green dark:bg-grey-900" data-testid="thumbnail-filmstrip">
                            {Array.from({length: FRAME_COUNT}, (_, slot) => (
                                <div key={slot} className={clsx('h-full min-w-0 flex-1', !frames[slot] && !isStopped && 'animate-pulse bg-grey-200 motion-reduce:animate-none dark:bg-grey-800')}>
                                    {frames[slot] && <FilmstripFrame src={frames[slot]} />}
                                </div>
                            ))}
                        </div>
                        {/* The handle, ringed in white so it shows over light and dark footage alike */}
                        {duration > 0 && (
                            <div
                                className="pointer-events-none absolute -inset-y-1.5 w-[3px] -translate-x-1/2 rounded-full bg-green shadow-[0_0_0_2px_#fff,0_1px_6px_rgba(0,0,0,0.35)]"
                                style={{left: `calc(${THUMB_WIDTH / 2}px + (100% - ${THUMB_WIDTH}px) * ${time / duration})`}}
                            >
                                <span className="absolute -top-2 left-1/2 size-3.5 -translate-x-1/2 rounded-full bg-green shadow-[0_0_0_2px_#fff,0_1px_6px_rgba(0,0,0,0.35)]" />
                            </div>
                        )}
                    </div>
                </>
            )}

            <ImageUploadForm fileInputRef={fileInputRef} mimeTypes={mimeTypes} onFileChange={onFilesPicked} />
            <div className="mt-6 flex items-center justify-between gap-3 whitespace-nowrap">
                {isUnreadable ? <span /> : (
                    // A shorter label on a narrow screen, so the row of buttons still fits
                    <button aria-label="Upload image" className={clsx(secondaryButton, 'inline-flex items-center gap-2')} type="button" onClick={chooseImage}>
                        <ImageIcon aria-hidden="true" className="size-4" />
                        <span className="xs:hidden">Upload</span>
                        <span className="hidden xs:inline">Upload image</span>
                    </button>
                )}
                <div className="flex gap-3">
                    <button className={secondaryButton} type="button" onClick={onClose}>Cancel</button>
                    {isUnreadable ? (
                        <button className={clsx(primaryButton, 'inline-flex items-center gap-2')} type="button" onClick={chooseImage}>
                            <ImageIcon aria-hidden="true" className="size-4" />
                            Upload image
                        </button>
                    ) : (
                        <button className={primaryButton} disabled={isLoading || isSelecting} type="button" onClick={select}>Select</button>
                    )}
                </div>
            </div>
            {/* In red and centred, as Koenig's cards say an upload failed */}
            {isSelectFailed && (
                <p className="mt-3 text-center font-sans text-sm font-semibold text-red" data-testid="thumbnail-select-error" role="alert">
                    This frame couldn&apos;t be saved. Try again, or upload an image.
                </p>
            )}
        </div>
    );
}

Picker.propTypes = {
    headingId: PropTypes.string,
    videoSrc: PropTypes.string,
    videoWidth: PropTypes.number,
    videoHeight: PropTypes.number,
    thumbnail: PropTypes.string,
    mimeTypes: PropTypes.arrayOf(PropTypes.string),
    onClose: PropTypes.func,
    onSelectFrame: PropTypes.func,
    onUploadImage: PropTypes.func
};

/**
 * Picks a video's thumbnail from its own frames, or an uploaded image. `onSelectFrame` gets the
 * chosen frame as a JPEG, and `onUploadImage` the image files picked. A video whose
 * frames can't be read shows its `thumbnail`, with only an image to choose.
 */
export function VideoThumbnailPicker({isOpen, videoSrc, videoWidth, videoHeight, thumbnail, mimeTypes = [], onClose, onSelectFrame, onUploadImage}) {
    const headingId = React.useId();

    return (
        <Modal isOpen={isOpen} labelledBy={headingId} onClose={onClose}>
            <Picker
                headingId={headingId}
                mimeTypes={mimeTypes}
                thumbnail={thumbnail}
                videoHeight={videoHeight}
                videoSrc={videoSrc}
                videoWidth={videoWidth}
                onClose={onClose}
                onSelectFrame={onSelectFrame}
                onUploadImage={onUploadImage}
            />
        </Modal>
    );
}

VideoThumbnailPicker.propTypes = {
    isOpen: PropTypes.bool,
    ...Picker.propTypes
};
