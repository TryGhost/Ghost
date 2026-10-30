export function isGif(url: string | undefined): boolean {
    return /\.gif$/i.test(String(url).split(/[?#]/, 1)[0]);
}
