interface ImageDimensions {
    width: number;
    height: number;
}

interface ResizeOptions {
    width?: number;
    height?: number;
}

export default function resizeImage(image: ImageDimensions, {width: desiredWidth, height: desiredHeight}: ResizeOptions = {}): ImageDimensions {
    const {width, height} = image;
    const ratio = width / height;

    if (desiredWidth) {
        const resizedHeight = Math.round(desiredWidth / ratio);

        return {
            width: desiredWidth,
            height: resizedHeight
        };
    }

    if (desiredHeight) {
        const resizedWidth = Math.round(desiredHeight * ratio);

        return {
            width: resizedWidth,
            height: desiredHeight
        };
    }

    return {width, height};
}
