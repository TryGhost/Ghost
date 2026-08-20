import html2canvas from 'html2canvas-pro';
import {resolvePreviewElement} from './preview-inspection';

import type {PreviewElementTarget} from './preview-inspection';

export const SCREENSHOT_LIMITS = {
    maxDimension: 8_192,
    maxPixels: 16 * 1024 * 1024,
    maxDataUrlCharacters: 12 * 1024 * 1024
} as const;

export type ScreenshotRequest =
    | {kind: 'viewport'}
    | {kind: 'full_page'}
    | ({kind: 'element'} & PreviewElementTarget);

export type ScreenshotResult = {
    dataUrl: string;
    width: number;
    height: number;
    warnings: string[];
};

type CaptureArea = {
    target: HTMLElement;
    width: number;
    height: number;
    x?: number;
    y?: number;
};

type ScreenshotViewport = {
    width: number;
    height: number;
    scrollX: number;
    scrollY: number;
};

function iframeDocument(iframe: HTMLIFrameElement): Document {
    const document = iframe.contentDocument;
    if (!document?.documentElement || !document.body) {
        throw new Error('The preview is not ready for screenshots.');
    }
    return document;
}

function captureArea(document: Document, viewport: ScreenshotViewport, request: ScreenshotRequest): CaptureArea {
    const root = document.documentElement;

    if (request.kind === 'element') {
        const selected = resolvePreviewElement(document, request);
        const FrameHTMLElement = document.defaultView?.HTMLElement;
        if (!FrameHTMLElement || !(selected instanceof FrameHTMLElement)) {
            throw new Error('The screenshot target is not an HTML element.');
        }
        const bounds = selected.getBoundingClientRect();
        return {target: selected, width: Math.ceil(bounds.width), height: Math.ceil(bounds.height)};
    }

    if (request.kind === 'viewport') {
        return {
            target: root,
            width: viewport.width,
            height: viewport.height,
            x: viewport.scrollX,
            y: viewport.scrollY
        };
    }

    return {
        target: root,
        width: Math.max(root.scrollWidth, document.body.scrollWidth),
        height: Math.max(root.scrollHeight, document.body.scrollHeight)
    };
}

function absoluteUrl(source: string | null, document: Document): URL | undefined {
    if (!source) {
        return undefined;
    }
    try {
        return new URL(source, document.baseURI);
    } catch {
        return undefined;
    }
}

function absoluteImageUrl(image: HTMLImageElement, document: Document): URL | undefined {
    return absoluteUrl(image.currentSrc || image.getAttribute('src'), document);
}

function imageElements(target: HTMLElement): HTMLImageElement[] {
    const images = Array.from(target.querySelectorAll('img'));
    if (target.tagName === 'IMG') {
        images.unshift(target as HTMLImageElement);
    }
    return images;
}

function svgImageElements(target: HTMLElement): SVGImageElement[] {
    const images = Array.from(target.querySelectorAll('image'));
    if (target.tagName.toLowerCase() === 'image') {
        images.unshift(target as unknown as SVGImageElement);
    }
    return images;
}

function allElements(target: HTMLElement): Element[] {
    return [target, ...Array.from(target.querySelectorAll('*'))];
}

function backgroundImageUrls(element: Element, document: Document): URL[] {
    const value = document.defaultView?.getComputedStyle(element).backgroundImage ?? (element as HTMLElement).style?.backgroundImage ?? '';
    return Array.from(value.matchAll(/url\((?:"([^"]+)"|'([^']+)'|([^)]*))\)/g)).flatMap((match) => {
        const url = absoluteUrl((match[1] || match[2] || match[3] || '').trim(), document);
        return url ? [url] : [];
    });
}

function isExternalImage(url: URL, document: Document): boolean {
    return (url.protocol === 'http:' || url.protocol === 'https:') && url.origin !== document.location.origin;
}

function externalImageSources(target: HTMLElement): {count: number; sources: Set<string>} {
    const document = target.ownerDocument;
    const sources = new Set<string>();
    let count = 0;

    imageElements(target).forEach((image) => {
        const url = absoluteImageUrl(image, document);
        if (url && isExternalImage(url, document)) {
            sources.add(url.href);
            count += 1;
        }
    });
    svgImageElements(target).forEach((image) => {
        const url = absoluteUrl(image.getAttribute('href') || image.getAttribute('xlink:href'), document);
        if (url && isExternalImage(url, document)) {
            sources.add(url.href);
            count += 1;
        }
    });
    allElements(target).forEach((element) => {
        backgroundImageUrls(element, document).forEach((url) => {
            if (isExternalImage(url, document)) {
                sources.add(url.href);
                count += 1;
            }
        });
    });

    return {count, sources};
}

function replaceExternalImages(clonedDocument: Document, clonedTarget: HTMLElement, sources: Set<string>): void {
    imageElements(clonedTarget).forEach((image) => {
        const url = absoluteImageUrl(image, clonedDocument);
        if (!url || !sources.has(url.href)) {
            return;
        }

        const placeholder = clonedDocument.createElement('div');
        placeholder.textContent = image.alt ? `Image unavailable: ${image.alt}` : 'External image unavailable';
        placeholder.style.cssText = [
            `width:${image.width || image.getBoundingClientRect().width}px`,
            `height:${image.height || image.getBoundingClientRect().height}px`,
            'display:flex',
            'align-items:center',
            'justify-content:center',
            'background:#f3f4f6',
            'color:#4b5563',
            'font:14px sans-serif'
        ].join(';');
        if (image === clonedTarget) {
            image.removeAttribute('srcset');
            image.src = 'data:image/gif;base64,R0lGODlhAQABAAAAACw=';
            image.alt = placeholder.textContent;
            image.style.cssText = placeholder.style.cssText;
        } else {
            image.replaceWith(placeholder);
        }
    });
    svgImageElements(clonedTarget).forEach((image) => {
        const url = absoluteUrl(image.getAttribute('href') || image.getAttribute('xlink:href'), clonedDocument);
        if (url && sources.has(url.href)) {
            image.removeAttribute('href');
            image.removeAttribute('xlink:href');
            image.style.visibility = 'hidden';
        }
    });
    allElements(clonedTarget).forEach((element) => {
        if (backgroundImageUrls(element, clonedDocument).some(url => sources.has(url.href))) {
            (element as HTMLElement).style?.setProperty('background-image', 'none', 'important');
            (element as HTMLElement).style?.setProperty('background-color', '#f3f4f6', 'important');
        }
    });
}

function externalImageWarning(count: number): string[] {
    if (count === 0) {
        return [];
    }
    return [`${count} external image${count === 1 ? ' was' : 's were'} replaced in the screenshot.`];
}

export async function captureDocumentScreenshot(document: Document, viewport: ScreenshotViewport, request: ScreenshotRequest, signal?: AbortSignal): Promise<ScreenshotResult> {
    if (signal?.aborted) {
        throw new DOMException('Aborted', 'AbortError');
    }
    const area = captureArea(document, viewport, request);
    if (area.width < 1 || area.height < 1) {
        throw new Error('The screenshot target has no visible size.');
    }
    if (area.width > SCREENSHOT_LIMITS.maxDimension || area.height > SCREENSHOT_LIMITS.maxDimension || area.width * area.height > SCREENSHOT_LIMITS.maxPixels) {
        throw new Error(`The screenshot target exceeds the ${SCREENSHOT_LIMITS.maxDimension}px or ${SCREENSHOT_LIMITS.maxPixels}-pixel size limit.`);
    }

    const externalImages = externalImageSources(area.target);
    const canvas = await html2canvas(area.target, {
        width: area.width,
        height: area.height,
        x: area.x,
        y: area.y,
        scale: 1,
        logging: false,
        useCORS: false,
        allowTaint: false,
        imageTimeout: 2_000,
        signal,
        onclone: (clonedDocument, element) => replaceExternalImages(clonedDocument, element, externalImages.sources)
    });

    const dataUrl = canvas.toDataURL('image/png');
    if (dataUrl.length > SCREENSHOT_LIMITS.maxDataUrlCharacters) {
        throw new Error('The encoded screenshot exceeds the output size limit.');
    }
    return {
        dataUrl,
        width: canvas.width,
        height: canvas.height,
        warnings: externalImageWarning(externalImages.count)
    };
}

export function capturePreviewScreenshot(iframe: HTMLIFrameElement, request: ScreenshotRequest, signal?: AbortSignal): Promise<ScreenshotResult> {
    const document = iframeDocument(iframe);
    return captureDocumentScreenshot(document, {
        width: iframe.clientWidth,
        height: iframe.clientHeight,
        scrollX: document.defaultView?.scrollX ?? 0,
        scrollY: document.defaultView?.scrollY ?? 0
    }, request, signal);
}
