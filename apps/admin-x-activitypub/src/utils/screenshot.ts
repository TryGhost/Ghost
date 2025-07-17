import html2canvas from 'html2canvas-objectfit-fix';

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
            imageTimeout: 0
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
