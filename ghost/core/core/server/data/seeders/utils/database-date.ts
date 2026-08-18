import {faker} from '@faker-js/faker';

const databaseDatePattern = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}(?:\.\d+)?$/;

export function dateToDatabaseString(date: Date | string): string {
    if (typeof date === 'string') {
        // SQLite fix when reusing other dates from the db
        return date;
    }
    return date.toISOString().replace('Z', '').replace('T', ' ');
}

export function parse(date: Date | string | number): Date {
    if (date instanceof Date) {
        return new Date(date);
    }

    if (typeof date === 'string' && databaseDatePattern.test(date)) {
        return new Date(date.replace(' ', 'T') + 'Z');
    }

    return new Date(date);
}

export function randomBetween(start: Date | string | number, end: Date | string | number): Date {
    const earliest = parse(start);
    const latest = parse(end);

    return latest > earliest ? faker.date.between({from: earliest, to: latest}) : earliest;
}
