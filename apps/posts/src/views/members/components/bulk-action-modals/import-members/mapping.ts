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
 * Locate 10 non-empty cells from the start/middle(ish)/end of each column (30 non-empty values in total).
 * If the data contains 30 rows or fewer, all rows should be validated.
 */
export function sampleData(data: Record<string, string>[], validationSampleSize = 30): Record<string, string>[] {
    if (!data || data.length <= validationSampleSize) {
        return data;
    }

    const validatedSet: Record<string, string>[] = [];
    const sampleKeys = Object.keys(data[0]);

    sampleKeys.forEach((key) => {
        const nonEmptyKeyEntries = data.filter(entry => entry[key] && entry[key].trim() !== '');
        let sampledEntries: Record<string, string>[] = [];

        if (nonEmptyKeyEntries.length <= validationSampleSize) {
            sampledEntries = nonEmptyKeyEntries;
        } else {
            const headSize = Math.floor(validationSampleSize / 3);
            const tailSize = headSize;
            const middleSize = validationSampleSize - headSize - tailSize;

            const head = nonEmptyKeyEntries.slice(0, headSize);
            const tail = tailSize > 0 ? nonEmptyKeyEntries.slice(-tailSize) : [];
            const middleStart = Math.max(0, Math.floor(nonEmptyKeyEntries.length / 2) - Math.floor(middleSize / 2));
            const middle = nonEmptyKeyEntries.slice(middleStart, middleStart + middleSize);

            sampledEntries = [...head, ...middle, ...tail].slice(0, validationSampleSize);
        }

        sampledEntries.forEach((entry, index) => {
            if (!validatedSet[index]) {
                validatedSet[index] = {};
            }
            validatedSet[index][key] = entry[key];
        });
    });

    return validatedSet;
}

/**
 * Detects supported data types and auto-detects email by value.
 *
 * Returned mapping object contains mappings accepted by the members upload API.
 */
export function detectFieldTypes(data: Record<string, string>[]): Record<string, string> {
    const sampledData = sampleData(data);
    const mapping: Record<string, string> = {};

    // Match column headers against supported types using all headers from the
    // original data. sampleData only keeps keys with non-empty values, so
    // entirely-empty columns (e.g. an empty "note" column) would be missed if
    // we only checked sampled entries.
    if (data.length > 0) {
        for (const key of Object.keys(data[0])) {
            if (!mapping.name && /name/i.test(key)) {
                mapping.name = key;
                continue;
            }

            if (!mapping[key] && SUPPORTED_TYPES.includes(key) && !AUTO_DETECTED_TYPES.includes(key)) {
                mapping[key] = key;
            }
        }
    }

    // Detect value-based types (email) from sampled data
    let i = 0;
    while (i <= sampledData.length - 1) {
        if (mapping.email) {
            break;
        }

        const entry = sampledData[i];
        for (const [key, value] of Object.entries(entry)) {
            if (!mapping.email && value && EMAIL_REGEX.test(value)) {
                mapping.email = key;
            }
        }

        i += 1;
    }

    return mapping;
}

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
