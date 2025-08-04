import {v4 as uuid} from 'uuid';

/**
 * Generate a unique ID using timestamp and random string
 */
export function generateId(): string {
    return Date.now().toString(16) + Math.random().toString(16).substring(2, 10);
}

/**
 * Generate a UUID v4
 */
export function generateUuid(): string {
    return uuid();
}

/**
 * Generate a URL-safe slug from text
 */
export function generateSlug(text: string): string {
    return text.toLowerCase()
        .trim()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-+|-+$/g, '');
}