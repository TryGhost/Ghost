export function isGif(url) {
    return /\.gif$/i.test(String(url).split(/[?#]/, 1)[0]);
}
