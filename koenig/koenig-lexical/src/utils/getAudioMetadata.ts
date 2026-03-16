// gets image dimensions from a given Url

export async function getAudioMetadata(url: string): Promise<{duration: number}> {
    const audio = new Audio();
    let duration: number;

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
