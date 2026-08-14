export default function isUnsplashImage(url: string): boolean {
    return /images\.unsplash\.com/.test(url);
}
