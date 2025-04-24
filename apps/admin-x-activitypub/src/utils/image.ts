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
