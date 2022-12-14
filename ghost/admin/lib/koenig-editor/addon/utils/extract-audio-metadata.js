export default function extractAudioMetadata(file) {
    return new Promise((resolve) => {
        let audio = new Audio();
        let duration;
        const mimeType = file.type;
        audio.onloadedmetadata = function () {
            duration = audio.duration;
            resolve({
                duration,
                mimeType
            });
        };
        audio.src = URL.createObjectURL(file);
    });
}
