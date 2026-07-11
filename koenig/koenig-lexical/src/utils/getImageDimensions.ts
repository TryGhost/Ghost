// gets image dimensions from a given Url

export async function getImageDimensions(url) {
    const img = new Image();
    return new Promise((resolve, reject) => {
        img.onload = () => {
            resolve({width: img.naturalWidth, height: img.naturalHeight});
        };
        img.onerror = reject;
        // Set image src after listeners to avoid the image loading before the listener is set
        img.src = url;
    });
}
