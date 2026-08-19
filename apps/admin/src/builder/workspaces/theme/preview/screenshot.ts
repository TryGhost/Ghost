import html2canvas from 'html2canvas-pro';

export type ScreenshotRequest =
    | {kind: 'viewport'}
    | {kind: 'full_page'}
    | {kind: 'element'; selector: string};

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

function iframeDocument(iframe: HTMLIFrameElement): Document {
    const document = iframe.contentDocument;
    if (!document?.documentElement || !document.body) {
        throw new Error('The preview is not ready for screenshots.');
    }
    return document;
}

function captureArea(iframe: HTMLIFrameElement, request: ScreenshotRequest): CaptureArea {
    const document = iframeDocument(iframe);
    const root = document.documentElement;

    if (request.kind === 'element') {
        let selected: Element | null;
        try {
            selected = document.querySelector(request.selector);
        } catch {
            throw new Error(`Invalid screenshot selector: ${request.selector}`);
        }
        const FrameHTMLElement = document.defaultView?.HTMLElement;
        if (!FrameHTMLElement || !(selected instanceof FrameHTMLElement)) {
            throw new Error(`No preview element matches: ${request.selector}`);
        }
        const bounds = selected.getBoundingClientRect();
        return {target: selected, width: Math.ceil(bounds.width), height: Math.ceil(bounds.height)};
    }

    if (request.kind === 'viewport') {
        return {
            target: root,
            width: iframe.clientWidth,
            height: iframe.clientHeight,
            x: document.defaultView?.scrollX ?? 0,
            y: document.defaultView?.scrollY ?? 0
        };
    }

    return {
        target: root,
        width: Math.max(root.scrollWidth, document.body.scrollWidth),
        height: Math.max(root.scrollHeight, document.body.scrollHeight)
    };
}

function absoluteImageUrl(image: HTMLImageElement, document: Document): URL | undefined {
    const source = image.currentSrc || image.getAttribute('src');
    if (!source) {
        return undefined;
    }
    try {
        return new URL(source, document.baseURI);
    } catch {
        return undefined;
    }
}

function imageElements(target: HTMLElement): HTMLImageElement[] {
    const images = Array.from(target.querySelectorAll('img'));
    if (target.tagName === 'IMG') {
        images.unshift(target as HTMLImageElement);
    }
    return images;
}

function externalImageSources(target: HTMLElement): {count: number; sources: Set<string>} {
    const document = target.ownerDocument;
    const pageOrigin = document.location.origin;
    const sources = new Set<string>();
    let count = 0;

    imageElements(target).forEach((image) => {
        const url = absoluteImageUrl(image, document);
        if (url && (url.protocol === 'http:' || url.protocol === 'https:') && url.origin !== pageOrigin) {
            sources.add(url.href);
            count += 1;
        }
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
}

function externalImageWarning(count: number): string[] {
    if (count === 0) {
        return [];
    }
    return [`${count} external image${count === 1 ? ' was' : 's were'} replaced in the screenshot.`];
}

export async function capturePreviewScreenshot(iframe: HTMLIFrameElement, request: ScreenshotRequest): Promise<ScreenshotResult> {
    const area = captureArea(iframe, request);
    if (area.width < 1 || area.height < 1) {
        throw new Error('The screenshot target has no visible size.');
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
        imageTimeout: 0,
        onclone: (document, element) => replaceExternalImages(document, element, externalImages.sources)
    });

    return {
        dataUrl: canvas.toDataURL('image/png'),
        width: canvas.width,
        height: canvas.height,
        warnings: externalImageWarning(externalImages.count)
    };
}
