import html2canvas from 'html2canvas';

export interface ScreenshotOptions {
    filename?: string;
    scale?: number;
    backgroundColor?: string | null;
}

export async function takeScreenshot(
    element: HTMLElement,
    options: ScreenshotOptions = {}
): Promise<void> {
    const {
        filename = `screenshot-${Date.now()}.png`,
        scale = 2,
        backgroundColor = null
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

        canvas.toBlob((blob) => {
            if (!blob) {
                // eslint-disable-next-line no-console
                console.error('Failed to create blob from canvas');
                return;
            }

            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = filename;

            document.body.appendChild(link);
            link.click();

            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        }, 'image/png');
    } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Failed to take screenshot:', error);
        throw error;
    }
}