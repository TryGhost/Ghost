export function getImageFilenameFromSrc(src) {
    const url = new URL(src);
    const fileName = url.pathname.match(/\/([^/]*)$/)[1];
    return fileName;
}