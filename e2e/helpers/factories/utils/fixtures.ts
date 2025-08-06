export function generateDateBasedId(): string {
    return Date.now().toString(16) + Math.random().toString(16).substring(2, 10);
}

export function generateSlug(text: string): string {
    return text.toLowerCase()
        .trim()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-+|-+$/g, '');
}
