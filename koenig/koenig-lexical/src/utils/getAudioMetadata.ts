// gets image dimensions from a given Url

export async function getAudioMetadata(url) {
    let audio = new Audio();
    let duration;

    return new Promise((resolve) => {
        audio.onloadedmetadata = function () {
            duration = audio.duration;
            resolve({
                duration
            });
        };
        audio.src = url;
    });
}
