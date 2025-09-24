import {faker} from '@faker-js/faker';

/**
 * Generate a random email address
 */
export function randomEmail(): string {
    return faker.internet.email();
}

/**
 * Generate a random person's name
 */
export function randomName(): string {
    return faker.person.fullName();
}

/**
 * Generate a random first name
 */
export function randomFirstName(): string {
    return faker.person.firstName();
}

/**
 * Generate a random last name
 */
export function randomLastName(): string {
    return faker.person.lastName();
}

/**
 * Generate a random password
 */
export function randomPassword(length = 12): string {
    return faker.internet.password({length});
}

/**
 * Generate a random username
 */
export function randomUsername(): string {
    return faker.internet.username();
}

/**
 * Generate a random URL
 */
export function randomUrl(): string {
    return faker.internet.url();
}

/**
 * Generate random text
 */
export function randomText(wordCount = 10): string {
    return faker.lorem.words(wordCount);
}

/**
 * Generate a random title
 */
export function randomTitle(): string {
    return faker.lorem.sentence();
}