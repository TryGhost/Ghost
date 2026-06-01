/**
 * Copy text to the clipboard, with a fallback for contexts where the async
 * Clipboard API is unavailable or blocked — notably the embedded admin iframe,
 * which lacks the `clipboard-write` permission, so `navigator.clipboard` rejects.
 * Mirrors shade's share-modal copy helper.
 */
export default async function copyToClipboard(text: string): Promise<void> {
    if (navigator.clipboard?.writeText) {
        try {
            await navigator.clipboard.writeText(text);
            return;
        } catch {
            // Fall through to the execCommand fallback below.
        }
    }

    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'fixed';
    textarea.style.left = '-9999px';
    textarea.style.top = '0';
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
}
