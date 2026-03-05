export const FIELD_MAPPINGS = [
    {label: 'Email', value: 'email'},
    {label: 'Name', value: 'name'},
    {label: 'Note', value: 'note'},
    {label: 'Subscribed to emails', value: 'subscribed_to_emails'},
    {label: 'Stripe Customer ID', value: 'stripe_customer_id'},
    {label: 'Complimentary plan', value: 'complimentary_plan'},
    {label: 'Labels', value: 'labels'},
    {label: 'Created at', value: 'created_at'}
];

const SUPPORTED_TYPES = [
    'email',
    'name',
    'note',
    'subscribed_to_emails',
    'complimentary_plan',
    'stripe_customer_id',
    'labels',
    'created_at'
];

const AUTO_DETECTED_TYPES = ['email'];

// Simple email regex for auto-detection (not full validation — just good enough to identify email columns)
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export class MembersFieldMapping {
    private _mapping: Record<string, string | null>;

    constructor(mapping: Record<string, string>) {
        this._mapping = {};
        if (mapping) {
            for (const [key, value] of Object.entries(mapping)) {
                this._mapping[value] = key;
            }
        }
    }

    get(key: string): string | null {
        return this._mapping[key] ?? null;
    }

    toJSON(): Record<string, string | null> {
        return {...this._mapping};
    }

    getKeyByValue(searchedValue: string): string | null {
        for (const [key, value] of Object.entries(this._mapping)) {
            if (value === searchedValue) {
                return key;
            }
        }
        return null;
    }

    updateMapping(from: string, to: string | null): MembersFieldMapping {
        const newMapping = new MembersFieldMapping({});
        newMapping._mapping = {...this._mapping};

        // Remove any existing mapping to the same target
        if (to) {
            for (const key in newMapping._mapping) {
                if (newMapping._mapping[key] === to) {
                    newMapping._mapping[key] = null;
                }
            }
        }

        newMapping._mapping[from] = to;
        return newMapping;
    }
}

/**
 * Samples data for type detection following the Ember implementation:
 * Takes 10 from start, 10 from middle, 10 from end (30 total).
 * If data has 30 rows or fewer, all rows are used.
 */
function sampleData(data: Record<string, string>[], validationSampleSize = 30): Record<string, string>[] {
    if (!data || data.length <= validationSampleSize) {
        return data;
    }

    const validatedSet: Record<string, string>[] = [{}];
    const sampleKeys = Object.keys(data[0]);

    sampleKeys.forEach((key) => {
        const nonEmptyKeyEntries = data.filter(entry => entry[key] && entry[key].trim() !== '');

        if (nonEmptyKeyEntries.length <= validationSampleSize) {
            nonEmptyKeyEntries.forEach((entry, index) => {
                if (!validatedSet[index]) {
                    validatedSet[index] = {};
                }
                validatedSet[index][key] = entry[key];
            });
        } else {
            const partitionSize = Math.floor(validationSampleSize / 3);
            const head = data.slice(0, partitionSize);
            const tail = data.slice(data.length - partitionSize, data.length);
            const middleIndex = Math.floor(data.length / 2);
            const middle = data.slice(middleIndex - 2, middleIndex + 3);

            [...head, ...middle, ...tail].forEach((entry, index) => {
                if (!validatedSet[index]) {
                    validatedSet[index] = {};
                }
                validatedSet[index][key] = entry[key];
            });
        }
    });

    return validatedSet;
}

/**
 * Auto-detects field types from CSV data.
 * Ported from ghost/admin/app/services/member-import-validator.js
 */
export function detectFieldTypes(data: Record<string, string>[]): Record<string, string> {
    const sampledData = sampleData(data);
    const mapping: Record<string, string> = {};

    let i = 0;
    while (i <= sampledData.length - 1) {
        if (mapping.email && mapping.stripe_customer_id) {
            break;
        }

        const entry = sampledData[i];
        for (const [key, value] of Object.entries(entry)) {
            if (!mapping.email && value && EMAIL_REGEX.test(value)) {
                mapping.email = key;
                continue;
            }

            if (!mapping.name && /name/i.test(key)) {
                mapping.name = key;
                continue;
            }

            if (!mapping[key] && SUPPORTED_TYPES.includes(key) && !AUTO_DETECTED_TYPES.includes(key)) {
                mapping[key] = key;
            }
        }

        i += 1;
    }

    return mapping;
}

/**
 * Formats import error messages to user-friendly strings.
 * Ported from ghost/admin/app/components/modal-import-members.js
 */
export function formatImportError(error: string): string {
    return error
        .replace(
            'Value in [members.email] cannot be blank.',
            'Missing email address'
        )
        .replace(
            'Value in [members.note] exceeds maximum length of 2000 characters.',
            'Note is too long'
        )
        .replace(
            'Value in [members.subscribed] must be one of true, false, 0 or 1.',
            'Value of "Subscribed to emails" must be "true" or "false"'
        )
        .replace(
            'Validation (isEmail) failed for email',
            'Invalid email address'
        )
        .replace(
            /No such customer:[^,]*/,
            'Could not find Stripe customer'
        );
}

/**
 * Parse a CSV file into an array of objects with header keys.
 * Simple implementation that handles quoted fields and newlines within quotes.
 */
export function parseCSV(text: string): Record<string, string>[] {
    const rows: string[][] = [];
    let current = '';
    let inQuotes = false;
    let row: string[] = [];

    for (let i = 0; i < text.length; i++) {
        const char = text[i];
        const next = text[i + 1];

        if (inQuotes) {
            if (char === '"' && next === '"') {
                current += '"';
                i += 1; // skip escaped quote
            } else if (char === '"') {
                inQuotes = false;
            } else {
                current += char;
            }
        } else {
            if (char === '"') {
                inQuotes = true;
            } else if (char === ',') {
                row.push(current.trim());
                current = '';
            } else if (char === '\n' || (char === '\r' && next === '\n')) {
                row.push(current.trim());
                current = '';
                if (row.some(cell => cell !== '')) {
                    rows.push(row);
                }
                row = [];
                if (char === '\r') {
                    i += 1; // skip \n after \r
                }
            } else {
                current += char;
            }
        }
    }

    // Handle last row
    if (current || row.length > 0) {
        row.push(current.trim());
        if (row.some(cell => cell !== '')) {
            rows.push(row);
        }
    }

    if (rows.length < 2) {
        return [];
    }

    const headers = rows[0];
    const data: Record<string, string>[] = [];

    for (let i = 1; i < rows.length; i++) {
        const obj: Record<string, string> = {};
        headers.forEach((header, j) => {
            obj[header] = rows[i][j] || '';
        });
        data.push(obj);
    }

    return data;
}

/**
 * Generates a simple CSV string from rows with errors.
 * Used to create the downloadable error file.
 */
export function unparseErrorCSV(rows: Array<Record<string, string> & {error: string}>): string {
    if (rows.length === 0) {
        return '';
    }

    const allKeys = Object.keys(rows[0]);
    const headers = allKeys.map(key => `"${key.replace(/"/g, '""')}"`).join(',');

    const dataRows = rows.map((row) => {
        return allKeys.map((key) => {
            const val = (row[key] ?? '').toString();
            return `"${val.replace(/"/g, '""')}"`;
        }).join(',');
    });

    return [headers, ...dataRows].join('\n');
}
