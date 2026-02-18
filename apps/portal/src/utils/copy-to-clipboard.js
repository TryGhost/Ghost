async function copyTextToClipboard(text) {
    if (window.navigator?.clipboard?.writeText) {
        try {
            await window.navigator.clipboard.writeText(text);
            return true;
        } catch (_) {
            // Fall back to execCommand below when clipboard API rejects.
        }
    }

    let textarea;
    try {
        textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.setAttribute('readonly', '');
        textarea.style.position = 'absolute';
        textarea.style.left = '-9999px';
        document.body.appendChild(textarea);
        textarea.select();
        return document.execCommand('copy');
    } catch (_) {
        return false;
    } finally {
        if (textarea?.parentNode) {
            textarea.parentNode.removeChild(textarea);
        }
    }
}

export default copyTextToClipboard;
