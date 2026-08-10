import html2canvas from 'html2canvas-pro';

/**
 * In Firefox, html2canvas positions whole-word text segments incorrectly
 * (spaces between words collapse, punctuation overlaps the previous glyph).
 * A tiny non-zero letter-spacing forces the per-glyph rendering path, where
 * every glyph is positioned from its own DOM-measured bounds and renders
 * correctly. Apply to the cloned subtree via the html2canvas `onclone` hook.
 */
export function fixFirefoxTextSpacing(element: HTMLElement): void {
    if (!navigator.userAgent.includes('Firefox')) {
        return;
    }
    element.style.letterSpacing = '0.1px';
    element.querySelectorAll<HTMLElement>('*').forEach((el) => {
        el.style.letterSpacing = '0.1px';
    });
}

export interface ScreenshotOptions {
    filename?: string;
    scale?: number;
    backgroundColor?: string | null;
    copyToClipboard?: boolean;
}

export async function takeScreenshot(
    element: HTMLElement,
    options: ScreenshotOptions = {}
): Promise<void> {
    const {
        filename = `screenshot-${Date.now()}.png`,
        scale = 2,
        backgroundColor = null,
        copyToClipboard = false
    } = options;

    try {
        const canvas = await html2canvas(element, {
            backgroundColor,
            scale,
            logging: false,
            useCORS: true,
            allowTaint: true,
            imageTimeout: 0,
            onclone: (_document, clonedElement) => fixFirefoxTextSpacing(clonedElement)
        });

        await new Promise<void>((resolve, reject) => {
            canvas.toBlob(async (blob) => {
                if (!blob) {
                    reject(new Error('Failed to create blob from canvas'));
                    return;
                }

                try {
                    if (copyToClipboard) {
                        if (navigator.clipboard && 'write' in navigator.clipboard && typeof ClipboardItem !== 'undefined') {
                            const clipboardItem = new ClipboardItem({'image/png': blob});
                            await navigator.clipboard.write([clipboardItem]);
                        } else {
                            throw new Error('Clipboard API not supported in this browser');
                        }
                    } else {
                        const url = URL.createObjectURL(blob);
                        const link = document.createElement('a');
                        link.href = url;
                        link.download = filename;

                        document.body.appendChild(link);
                        link.click();

                        document.body.removeChild(link);
                        URL.revokeObjectURL(url);
                    }

                    resolve();
                } catch (error) {
                    reject(error);
                }
            }, 'image/png');
        });
    } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Failed to take screenshot:', error);
        throw error;
    }
}
