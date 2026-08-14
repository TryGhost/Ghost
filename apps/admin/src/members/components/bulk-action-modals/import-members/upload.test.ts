import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {buildImportResponse} from '@/members/components/bulk-action-modals/import-members/upload';

describe('buildImportResponse', () => {
    let mockCreateObjectURL: ReturnType<typeof vi.fn>;

    beforeEach(() => {
        mockCreateObjectURL = vi.fn(() => 'blob:mock/0');
        vi.stubGlobal('URL', {
            ...URL,
            createObjectURL: mockCreateObjectURL,
            revokeObjectURL: vi.fn()
        });
    });

    afterEach(() => {
        vi.restoreAllMocks();
        vi.unstubAllGlobals();
    });

    it('returns counts for a fully successful import', () => {
        const result = buildImportResponse({
            meta: {
                stats: {imported: 5, invalid: []},
                import_label: {
                    name: 'Import 2026-03-17',
                    slug: 'import-2026-03-17'
                }
            }
        });

        expect(result.importedCount).toBe(5);
        expect(result.errorCount).toBe(0);
        expect(result.errorList).toEqual([]);
        expect(result.importLabel).toEqual({
            name: 'Import 2026-03-17',
            slug: 'import-2026-03-17'
        });
        expect(result.errorCsvName).toBe('Import 2026-03-17 - Errors.csv');
        expect(result.errorCsvUrl).toMatch(/^blob:/);
    });

    it('aggregates and deduplicates errors', () => {
        const result = buildImportResponse({
            meta: {
                stats: {
                    imported: 1,
                    invalid: [
                        {email: 'a@test.com', errors: ['Value in [members.email] cannot be blank.'], error: 'Value in [members.email] cannot be blank.'},
                        {email: 'b@test.com', errors: ['Value in [members.email] cannot be blank.'], error: 'Value in [members.email] cannot be blank.'},
                        {email: 'c@test.com', errors: ['Validation (isEmail) failed for email'], error: 'Validation (isEmail) failed for email'}
                    ]
                },
                import_label: {name: 'Test Import', slug: 'test-import'}
            }
        });

        expect(result.importedCount).toBe(1);
        expect(result.errorCount).toBe(3);
        expect(result.errorList).toEqual([
            {message: 'Missing email address', count: 2},
            {message: 'Invalid email address', count: 1}
        ]);
    });

    it('formats all known error types', () => {
        const result = buildImportResponse({
            meta: {
                stats: {
                    imported: 0,
                    invalid: [
                        {email: '', errors: ['Value in [members.email] cannot be blank.'], error: 'Value in [members.email] cannot be blank.'},
                        {email: 'x', errors: ['Value in [members.note] exceeds maximum length of 2000 characters.'], error: 'Value in [members.note] exceeds maximum length of 2000 characters.'},
                        {email: 'y', errors: ['Value in [members.subscribed] must be one of true, false, 0 or 1.'], error: 'Value in [members.subscribed] must be one of true, false, 0 or 1.'},
                        {email: 'z', errors: ['Validation (isEmail) failed for email'], error: 'Validation (isEmail) failed for email'},
                        {email: 'w', errors: ['No such customer:cus_abc123'], error: 'No such customer:cus_abc123'}
                    ]
                },
                import_label: {name: 'Errors', slug: 'errors'}
            }
        });

        const messages = result.errorList.map(e => e.message);
        expect(messages).toContain('Missing email address');
        expect(messages).toContain('Note is too long');
        expect(messages).toContain('Value of "Subscribed to emails" must be "true" or "false"');
        expect(messages).toContain('Invalid email address');
        expect(messages).toContain('Could not find Stripe customer');
    });

    it('gives a row that failed twice one entry per failure', () => {
        const result = buildImportResponse({
            meta: {
                stats: {
                    imported: 0,
                    invalid: [
                        {
                            email: 'a@test.com',
                            errors: ['Value in [members.email] cannot be blank.', 'Validation (isEmail) failed for email'],
                            error: 'Value in [members.email] cannot be blank.\nValidation (isEmail) failed for email'
                        }
                    ]
                },
                import_label: {name: 'Test', slug: 'test'}
            }
        });

        expect(result.errorList).toEqual([
            {message: 'Missing email address', count: 1},
            {message: 'Invalid email address', count: 1}
        ]);
    });

    it('keeps a reason whole however it is punctuated', () => {
        // A reason may quote a cell the publisher wrote, and a CSV cell legally holds
        // both a comma and a newline.
        const punctuated = 'custom_fields.home-address.country: Enter a 2-letter country code, like US.';
        const multiline = '"Gold\nPlan" is not a valid tier.';
        const result = buildImportResponse({
            meta: {
                stats: {
                    imported: 0,
                    invalid: [
                        {email: 'a@test.com', errors: [punctuated], error: punctuated},
                        {email: 'b@test.com', errors: [punctuated], error: punctuated},
                        {email: 'c@test.com', errors: [multiline], error: multiline}
                    ]
                },
                import_label: {name: 'Test', slug: 'test'}
            }
        });

        expect(result.errorList).toEqual([
            {message: punctuated, count: 2},
            {message: multiline, count: 1}
        ]);
    });

    it('drops a reason that humanises to nothing rather than listing a blank bullet', () => {
        const result = buildImportResponse({
            meta: {
                stats: {
                    imported: 0,
                    invalid: [{email: 'a@test.com', errors: ['  ', 'Validation (isEmail) failed for email'], error: '  \nValidation (isEmail) failed for email'}]
                },
                import_label: {name: 'Test', slug: 'test'}
            }
        });

        expect(result.errorList).toEqual([{message: 'Invalid email address', count: 1}]);
    });

    it('uses a default name when import_label is missing', () => {
        const result = buildImportResponse({
            meta: {
                stats: {imported: 2, invalid: []}
            }
        });

        expect(result.errorCsvName).toMatch(/^Import \d{4}-\d{2}-\d{2} \d{2}:\d{2} - Errors\.csv$/);
    });

    it('handles missing invalid array gracefully', () => {
        const result = buildImportResponse({
            meta: {
                 
                stats: {imported: 3, invalid: undefined}
            }
        });

        expect(result.importedCount).toBe(3);
        expect(result.errorCount).toBe(0);
        expect(result.errorList).toEqual([]);
    });

    it('creates a downloadable blob URL for the error CSV', () => {
        buildImportResponse({
            meta: {
                stats: {
                    imported: 0,
                    invalid: [{email: 'bad', errors: ['Validation (isEmail) failed for email'], error: 'Validation (isEmail) failed for email'}]
                },
                import_label: {name: 'Test', slug: 'test'}
            }
        });

        expect(mockCreateObjectURL).toHaveBeenCalledTimes(1);
        const blob = mockCreateObjectURL.mock.calls[0][0] as Blob;
        expect(blob.type).toBe('text/csv');
    });

    it('writes the error file with the submitted columns and no others', async () => {
        // The file echoes the row back, so every key on it becomes a column.
        buildImportResponse({
            meta: {
                stats: {
                    imported: 0,
                    invalid: [{
                        email: 'a@test.com',
                        'custom_fields.home-address.country': 'IRL',
                        errors: ['Missing email address', 'custom_fields.home-address.country: Enter a 2-letter country code, like US.'],
                        error: 'Missing email address\ncustom_fields.home-address.country: Enter a 2-letter country code, like US.'
                    }]
                },
                import_label: {name: 'Test', slug: 'test'}
            }
        });

        const csv = await (mockCreateObjectURL.mock.calls[0][0] as Blob).text();
        // CRLF between rows; a reason may itself contain a bare newline.
        const [header] = csv.split('\r\n');

        expect(header).toBe('"email","custom_fields.home-address.country","error"');
        expect(csv).toContain('"Missing email address\ncustom_fields.home-address.country: Enter a 2-letter country code, like US."');
    });
});
