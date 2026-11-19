import ImageIcon from '../../assets/icons/kg-card-type-image.svg?react';
import ImageUploadForm from './ImageUploadForm';
import PropTypes from 'prop-types';
import React from 'react';
import clsx from 'clsx';
import {FramesUnreadableError, LOAD_TIMEOUT_MS, canvasToJpeg, createFrameVideo, drawFrame, filmstripTimes, formatTime, hasUsableDuration, loadVideo, releaseVideo, seekVideo, whenFrameReady} from '../../utils/videoFrames';
import {Modal} from './Modal';
import {openFileSelection} from '../../utils/openFileSelection';

const FRAME_COUNT = 8;
const FRAME_WIDTH = 160;
// Within every browser's canvas size limit
const MAX_SAVED_WIDTH = 3840;
// Where extractVideoMetadata takes the card's own thumbnail from
const START_TIME = 0.5;
// Must match the range thumb's width below, which the handle is drawn over
const THUMB_WIDTH = 16;

const button = 'rounded-md px-4 py-2 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green focus-visible:ring-offset-2 dark:focus-visible:ring-offset-black';
const secondaryButton = clsx(button, 'border border-grey-300 text-black transition-colors hover:border-grey-500 dark:border-grey-800 dark:text-white dark:hover:border-grey-600');
const primaryButton = clsx(button, 'bg-black text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40 aria-disabled:cursor-not-allowed aria-disabled:opacity-40 dark:bg-white dark:text-black');

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
 * Frames from across the video, drawn from a second video element so the preview doesn't move. Only a
 * video that can't be read at all is reported; a slow or failed seek leaves the strip unfinished.
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
                if (!hasUsableDuration(video.duration)) {
                    throw new FramesUnreadableError('The video has no length to pick from');
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
    const [aspectRatio, setAspectRatio] = React.useState(videoWidth > 0 && videoHeight > 0 ? videoWidth / videoHeight : 16 / 9);
    const [isUnreadable, setUnreadable] = React.useState(false);
    const [isSelecting, setSelecting] = React.useState(false);
    const [isSelectFailed, setSelectFailed] = React.useState(false);
    const markUnreadable = React.useCallback(() => setUnreadable(true), []);
    const {frames, isStopped} = useFilmstrip(isUnreadable ? null : videoSrc, markUnreadable);
    const isLoading = !duration;
    const chooseImage = () => openFileSelection({fileInputRef});

    React.useEffect(() => {
        isOpenRef.current = true;
        return () => {
            isOpenRef.current = false;
        };
    }, []);

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
        const timeout = window.setTimeout(markUnreadable, LOAD_TIMEOUT_MS);
        const onLoaded = () => window.clearTimeout(timeout);
        video.addEventListener('loadedmetadata', onLoaded);
        return () => {
            window.clearTimeout(timeout);
            video.removeEventListener('loadedmetadata', onLoaded);
            releaseVideo(video);
        };
    }, [videoSrc, isUnreadable, markUnreadable]);

    const onPreviewLoaded = (event) => {
        const video = event.currentTarget;
        // No decodable picture (its sound may still play), or a length that can't be scrubbed
        if (!video.videoWidth || !hasUsableDuration(video.duration)) {
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
        if (isSelecting) {
            return;
        }
        const next = Number(event.target.value);
        setSelectFailed(false);
        setTime(next);
        previewRef.current.currentTime = next;
    };

    const select = async () => {
        if (isSelecting) {
            return;
        }
        const video = previewRef.current;
        setSelecting(true);
        setSelectFailed(false);
        try {
            await whenFrameReady(video);
            const frame = await canvasToJpeg(drawFrame(video, Math.min(video.videoWidth, MAX_SAVED_WIDTH)));
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

    const onFilesPicked = (event) => {
        const files = Array.from(event.target.files || []);
        if (files.length) {
            onUploadImage(files);
        }
    };

    let status = '';
    if (isUnreadable) {
        status = 'This video\'s frames couldn\'t be loaded. Upload an image instead.';
    } else if (isLoading) {
        status = 'Loading the video';
    }

    return (
        <div className="p-8 text-left font-sans" data-testid="video-thumbnail-picker">
            <h1 className="mr-6 text-2xl font-semibold leading-snug" id={headingId}>Select thumbnail</h1>
            <p className="sr-only" role="status">{status}</p>

            {isUnreadable ? (
                <div className="mt-5 overflow-hidden rounded-md bg-black" data-testid="thumbnail-unreadable">
                    {thumbnail && <img alt="Current thumbnail" className="block max-h-[45vh] w-full object-contain" src={thumbnail} />}
                </div>
            ) : (
                <>
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
                        {/* iOS drags a range only by its thumb, so the invisible thumb sits under the drawn handle */}
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
                        <div className="flex size-full overflow-hidden rounded-md bg-grey-100 peer-focus-visible:ring-2 peer-focus-visible:ring-green dark:bg-grey-900" data-testid="thumbnail-filmstrip">
                            {Array.from({length: FRAME_COUNT}, (_, slot) => (
                                <div key={slot} className={clsx('h-full min-w-0 flex-1', !frames[slot] && !isStopped && 'animate-pulse bg-grey-200 motion-reduce:animate-none dark:bg-grey-800')}>
                                    {frames[slot] && <FilmstripFrame src={frames[slot]} />}
                                </div>
                            ))}
                        </div>
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
                        // aria-disabled while saving: disabling the focused button would drop focus out of the dialog
                        <button aria-disabled={isSelecting || undefined} className={primaryButton} disabled={isLoading} type="button" onClick={select}>Select</button>
                    )}
                </div>
            </div>
            {isSelectFailed && !isUnreadable && (
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
