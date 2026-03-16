export function isGif(url: string | null | undefined): boolean {
    return /\.gif$/i.test(String(url).split(/[?#]/, 1)[0]);
}
