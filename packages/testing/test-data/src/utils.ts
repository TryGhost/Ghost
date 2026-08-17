import {faker} from "@faker-js/faker";

/**
 * Generate a MongoDB-style ObjectId. Browser-safe (no node:crypto) because
 * builders also run inside Vitest Browser Mode pages.
 */
export function generateId(): string {
    const timestamp = Math.floor(Date.now() / 1000).toString(16);
    const randomHex = faker.string.hexadecimal({length: 16, casing: "lower", prefix: ""});
    return timestamp + randomHex;
}

export function generateUuid(): string {
    return faker.string.uuid();
}

export function generateSlug(text: string): string {
    return text
        .toLowerCase()
        .replace(/[^\w\s-]/g, "")
        .replace(/\s+/g, "-")
        .replace(/--+/g, "-")
        .replace(/^-+/, "")
        .replace(/-+$/, "");
}
