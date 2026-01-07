const getAvailableImageWidths = function (image, imageSizes) {
    // get a sorted list of the available responsive widths
    const imageWidths = Object.values(imageSizes)
        .map(({width}) => width)
        .sort((a, b) => a - b);

    // select responsive widths that are usable based on the image width
    const availableImageWidths = imageWidths
        .filter(width => width <= image.width);

    // add the original image size to the responsive list if it's not captured by largest responsive size
    // - we can't know the width/height of the original `src` image because we don't know if it was resized
    //   or not. Adding the original image to the responsive list ensures we're not showing smaller sized
    //   images than we need to be
    if (image.width > availableImageWidths[availableImageWidths.length - 1] && image.width < imageWidths[imageWidths.length - 1]) {
        availableImageWidths.push(image.width);
    }

    return availableImageWidths;
};

module.exports = {
    getAvailableImageWidths
};
