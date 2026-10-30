export function getImageFilenameFromSrc(src: string): string {
    const url = new URL(src);
    const fileName = url.pathname.match(/\/([^/]*)$/)![1];
    return fileName;
}