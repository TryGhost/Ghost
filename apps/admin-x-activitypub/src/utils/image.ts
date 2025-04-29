export const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB limit
export const FILE_SIZE_ERROR_MESSAGE = 'Image must be less than 5MB in size.';

export const PROFILE_MAX_DIMENSIONS = {width: 400, height: 400};
export const COVER_MAX_DIMENSIONS = {width: 4000, height: 3000};

/**
 * Checks if an image file's dimensions are within specified maximum limits
 */
export const checkImageDimensions = (
    file: File,
    maxWidth: number,
    maxHeight: number
): Promise<boolean> => {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
            URL.revokeObjectURL(img.src);
            const withinMaxDimensions = img.width <= maxWidth && img.height <= maxHeight;
            resolve(withinMaxDimensions);
        };
        img.src = URL.createObjectURL(file);
    });
};

/**
 * Creates an error message for image dimension validation failures
 */
export const getDimensionErrorMessage = (maxWidth: number, maxHeight: number) => {
    return `Image dimensions must not exceed ${maxWidth}x${maxHeight} pixels.`;
};

/**
 * Checks if an image file has square dimensions (width equals height)
 */
export const isSquareImage = (file: File): Promise<boolean> => {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
            URL.revokeObjectURL(img.src);
            resolve(img.width === img.height);
        };
        img.src = URL.createObjectURL(file);
    });
};

/**
 * Error message for when an image is required to be square
 */
export const SQUARE_IMAGE_ERROR_MESSAGE = 'Image must be square.';
