export default function extractVideoMetadata(file) {
    return new Promise((resolve, reject) => {
        const mimeType = file.type;
        let duration, width, height;

        const video = document.createElement('video');
        video.preload = 'metadata';
        video.muted = true;
        video.playsInline = true;

        video.onerror = reject;

        video.onloadedmetadata = function () {
            duration = video.duration;
            width = video.videoWidth;
            height = video.videoHeight;

            setTimeout(() => {
                video.currentTime = 0.5;
            }, 200);
        };

        video.onseeked = function () {
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;

            const ctx = canvas.getContext('2d');
            ctx.drawImage(video, 0, 0, width, height);

            window.URL.revokeObjectURL(video.src);

            ctx.canvas.toBlob((thumbnailBlob) => {
                resolve({
                    duration,
                    width,
                    height,
                    mimeType,
                    thumbnailBlob
                });
            }, 'image/jpeg', 0.75);
        };

        video.src = URL.createObjectURL(file);
    });
}
