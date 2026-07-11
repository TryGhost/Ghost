const DEFAULT_SPACER_IMAGE_URL_TEMPLATE = 'https://img.spacergif.org/v1/{width}x{height}/0a/spacer.png';

function getSpacerImageConfig(options = {}) {
    const spacerImageConfigs = [
        options.spacerImage,
        options.imageOptimization?.spacerImage
    ];

    for (const spacerImageConfig of spacerImageConfigs) {
        if (spacerImageConfig && Object.hasOwn(spacerImageConfig, 'urlTemplate')) {
            return spacerImageConfig;
        }
    }
}

function getSpacerImageSrc({width, height, options = {}} = {}) {
    if (!Number.isFinite(width) || !Number.isFinite(height)) {
        return null;
    }

    const spacerImage = getSpacerImageConfig(options);
    const isDisabled = spacerImage && spacerImage.urlTemplate !== DEFAULT_SPACER_IMAGE_URL_TEMPLATE;

    if (isDisabled) {
        return null;
    }

    return DEFAULT_SPACER_IMAGE_URL_TEMPLATE
        .replaceAll('{width}', String(Math.round(width)))
        .replaceAll('{height}', String(Math.round(height)));
}

module.exports = {
    DEFAULT_SPACER_IMAGE_URL_TEMPLATE,
    getSpacerImageSrc
};
