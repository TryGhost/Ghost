import {randomBytes} from 'crypto';

/**
 * Generate a MongoDB-style ObjectId
 */
export function generateId(): string {
    const timestamp = Math.floor(Date.now() / 1000).toString(16);
    const randomHex = randomBytes(8).toString('hex');
    return timestamp + randomHex;
}

/**
 * Generate a UUID v4
 */
export function generateUuid(): string {
    const bytes = randomBytes(16);
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    
    const hex = bytes.toString('hex');
    return [
        hex.substring(0, 8),
        hex.substring(8, 12),
        hex.substring(12, 16),
        hex.substring(16, 20),
        hex.substring(20, 32)
    ].join('-');
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