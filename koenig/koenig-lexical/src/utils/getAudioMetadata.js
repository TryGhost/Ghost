// gets image dimensions from a given Url

export async function getAudioMetadata(url) {
    let audio = new Audio();
    let duration;

    const mimeType = url.type;
    return new Promise((resolve) => {
        audio.onloadedmetadata = function () {
            duration = audio.duration;
            resolve({
                duration,
                mimeType
            });
        };
        audio.src = url;
    });
}
