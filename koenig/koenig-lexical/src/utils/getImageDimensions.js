// gets image dimensions from a given Url

export async function getImageDimensions(url) {
    const img = new Image();
    img.src = url;
    return new Promise((resolve, reject) => {
        img.onload = () => {
            resolve({width: img.naturalWidth, height: img.naturalHeight});
        };
        img.onerror = reject;
    });
}
