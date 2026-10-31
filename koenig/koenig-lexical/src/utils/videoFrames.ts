// Frames read from a video in the browser, as extractVideoMetadata reads a card's first one. A
// video on another domain has to allow it (CORS): without that it still plays, but its frames
// can't be read back from a canvas.

// A video the browser can't decode may never report an error
const LOAD_TIMEOUT_MS = 15000;
// A seek over the network that never lands, once the connection drops
const SEEK_TIMEOUT_MS = 10000;

/** The frames can't be read here at all: the video failed to load, or its domain doesn't allow it. */
export class FramesUnreadableError extends Error {}

/** A video set up to have its frames read: muted, inline, and asking for CORS. */
export function createFrameVideo(): HTMLVideoElement {
    const video = document.createElement('video');
    video.crossOrigin = 'anonymous';
    video.muted = true;
    video.playsInline = true;
    video.preload = 'metadata';
    return video;
}

/** Stops a video downloading, and lets the browser let go of it. */
export function releaseVideo(video: HTMLVideoElement): void {
    video.removeAttribute('src');
    video.load();
}

/** Loads `src` far enough to seek, or rejects: unreadable on an error, a plain error on a timeout. */
export function loadVideo(video: HTMLVideoElement, src: string): Promise<void> {
    return new Promise((resolve, reject) => {
        const settle = (error?: Error) => {
            window.clearTimeout(timeout);
            video.onloadedmetadata = null;
            video.onerror = null;
            if (error) {
                releaseVideo(video);
                reject(error);
            } else {
                resolve();
            }
        };
        const timeout = window.setTimeout(() => settle(new Error('The video took too long to load')), LOAD_TIMEOUT_MS);

        video.onloadedmetadata = () => settle();
        video.onerror = () => settle(new FramesUnreadableError('The video could not be loaded'));
        video.src = src;
        // iOS Safari only loads when asked
        video.load();
    });
}

/** Resolves once a seek in progress lands on its frame; rejects if it errors or never does. */
export function whenSeeked(video: HTMLVideoElement): Promise<void> {
    return new Promise((resolve, reject) => {
        const finish = (error?: Error) => {
            window.clearTimeout(timeout);
            video.removeEventListener('seeked', onSeeked);
            video.removeEventListener('error', onError);
            if (error) {
                reject(error);
            } else {
                resolve();
            }
        };
        const onSeeked = () => finish();
        const onError = () => finish(new FramesUnreadableError('The video failed while seeking'));
        const timeout = window.setTimeout(() => finish(new Error('The seek took too long')), SEEK_TIMEOUT_MS);
        video.addEventListener('seeked', onSeeked);
        video.addEventListener('error', onError);
    });
}

/** Moves a video to `time` (seconds), resolving once that frame can be drawn. */
export function seekVideo(video: HTMLVideoElement, time: number): Promise<void> {
    const seeked = whenSeeked(video);
    video.currentTime = time;
    return seeked;
}

/** The frame a video is on, drawn `width` pixels wide (its own size when not given). */
export function drawFrame(video: HTMLVideoElement, width: number = video.videoWidth): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(width);
    canvas.height = Math.round((width * video.videoHeight) / video.videoWidth);
    canvas.getContext('2d')?.drawImage(video, 0, 0, canvas.width, canvas.height);
    return canvas;
}

/** A canvas as a JPEG; unreadable when the browser won't let it be read (a frame from another domain). */
export function canvasToJpeg(canvas: HTMLCanvasElement, quality = 0.75): Promise<Blob> {
    return new Promise((resolve, reject) => {
        try {
            canvas.toBlob((blob) => {
                if (blob) {
                    resolve(blob);
                } else {
                    reject(new Error('The frame could not be encoded'));
                }
            }, 'image/jpeg', quality);
        } catch (error) {
            reject(error instanceof DOMException && error.name === 'SecurityError' ? new FramesUnreadableError(error.message) : error);
        }
    });
}

/** When `count` frames spread across a video `duration` seconds long fall, each mid-slice. */
export function filmstripTimes(duration: number, count: number): number[] {
    return Array.from({length: count}, (_, i) => (duration * (i + 0.5)) / count);
}

/** A time as the video card shows it, `m:ss`. */
export function formatTime(seconds: number): string {
    const whole = Math.max(0, Math.floor(seconds));
    return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, '0')}`;
}
