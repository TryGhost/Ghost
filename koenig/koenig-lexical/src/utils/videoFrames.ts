// A video on another domain must allow CORS: without it the video plays, but a canvas it's drawn on can't be read

// A video the browser can't decode may never report an error
export const LOAD_TIMEOUT_MS = 15000;
const SEEK_TIMEOUT_MS = 10000;
const FRAME_POLL_MS = 50;

/** The frames can't be read here at all: the video failed to load, or its domain doesn't allow it. */
export class FramesUnreadableError extends Error {}

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

/**
 * Resolves once the frame the video is on can be drawn: no seek in progress, and its data decoded.
 * Safari can report a seek done before the data arrives, and no event marks it arriving, so this polls.
 */
export function whenFrameReady(video: HTMLVideoElement): Promise<void> {
    return new Promise((resolve, reject) => {
        const finish = (error?: Error) => {
            window.clearTimeout(timeout);
            window.clearInterval(poll);
            video.removeEventListener('seeked', check);
            video.removeEventListener('error', onError);
            if (error) {
                reject(error);
            } else {
                resolve();
            }
        };
        function check() {
            if (!video.seeking && video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
                finish();
            }
        }
        const onError = () => finish(new Error('The video failed while seeking'));
        const timeout = window.setTimeout(() => finish(new Error('The frame took too long to load')), SEEK_TIMEOUT_MS);
        const poll = window.setInterval(check, FRAME_POLL_MS);
        video.addEventListener('seeked', check);
        video.addEventListener('error', onError);
        check();
    });
}

/** Moves a video to `time` (seconds), resolving once that frame can be drawn. */
export function seekVideo(video: HTMLVideoElement, time: number): Promise<void> {
    video.currentTime = time;
    return whenFrameReady(video);
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

/** Whether a video reports a length the picker can scrub; WebM recorded in a browser often reports Infinity. */
export function hasUsableDuration(duration: number): boolean {
    return Number.isFinite(duration) && duration > 0;
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
