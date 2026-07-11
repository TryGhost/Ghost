import type {ExportDOMOptions} from '../export-dom.js';

export const DEFAULT_SPACER_IMAGE_URL_TEMPLATE = 'https://img.spacergif.org/v1/{width}x{height}/0a/spacer.png';

interface SpacerImageOptimization {
    spacerImage?: {
        urlTemplate?: unknown;
    };
}

export function getSpacerImageSrc({width, height, options = {}}: {width: number | null, height: number | null, options?: ExportDOMOptions}) {
    if (!Number.isFinite(width) || !Number.isFinite(height)) {
        return null;
    }

    const imageOptimization = options.imageOptimization as SpacerImageOptimization | undefined;
    const urlTemplate = imageOptimization?.spacerImage?.urlTemplate;
    if (urlTemplate !== undefined && urlTemplate !== DEFAULT_SPACER_IMAGE_URL_TEMPLATE) {
        return null;
    }

    return DEFAULT_SPACER_IMAGE_URL_TEMPLATE
        .replaceAll('{width}', String(Math.round(width!)))
        .replaceAll('{height}', String(Math.round(height!)));
}
