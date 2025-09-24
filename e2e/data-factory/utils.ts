import {randomBytes} from 'crypto';
import {randomUuid} from '../helpers/utils/generators';

/**
 * Generate a MongoDB-style ObjectId
 */
export function generateId(): string {
    const timestamp = Math.floor(Date.now() / 1000).toString(16);
    const randomHex = randomBytes(8).toString('hex');
    return timestamp + randomHex;
}

/**
 * Generate a UUID
 */
export function generateUuid(): string {
    return randomUuid();
}

/**
 * Generate a URL-friendly slug from text
 */
export function generateSlug(text: string): string {
    return text
        .toLowerCase()
        .replace(/[^\w\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/--+/g, '-')
        .replace(/^-+/, '')
        .replace(/-+$/, '');
}