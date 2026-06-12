export default async function copyTextToClipboard(text) {
    try {
        await window.navigator.clipboard.writeText(text);
        return true;
    } catch {
        return false;
    }
}