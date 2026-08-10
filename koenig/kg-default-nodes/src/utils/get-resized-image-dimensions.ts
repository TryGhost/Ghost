interface ImageDimensions {
    width: number;
    height: number;
}

export const getResizedImageDimensions = function (image: ImageDimensions, {width: desiredWidth, height: desiredHeight}: {width?: number; height?: number} = {}): ImageDimensions {
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
};
