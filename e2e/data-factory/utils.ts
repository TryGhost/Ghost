import {faker} from '@faker-js/faker';
import {randomBytes} from 'crypto';

/**
 * Generate a MongoDB-style ObjectId
 */
export function generateId(): string {
    const timestamp = Math.floor(Date.now() / 1000).toString(16);
    const randomHex = randomBytes(8).toString('hex');
    return timestamp + randomHex;
}

export function generateUuid(): string {
    return faker.string.uuid();
}

export function generateSlug(text: string): string {
    return text
        .toLowerCase()
        .replace(/[^\w\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/--+/g, '-')
        .replace(/^-+/, '')
        .replace(/-+$/, '');
}
