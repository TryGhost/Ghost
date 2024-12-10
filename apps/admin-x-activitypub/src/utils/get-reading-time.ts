export default function getReadingTime(content: string): string {
    // Average reading speed (words per minute)
    const wordsPerMinute = 275;

    const wordCount = content.replace(/<[^>]*>/g, '')
        .split(/\s+/)
        .filter(word => word.length > 0)
        .length;

    const minutes = Math.ceil(wordCount / wordsPerMinute);
    return `${minutes} min read`;
}
