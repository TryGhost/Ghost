import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {buildImportResponse} from '@src/views/members/components/bulk-action-modals/import-members/upload';

describe('buildImportResponse', () => {
    beforeEach(() => {
        vi.stubGlobal('URL', {
            ...URL,
            createObjectURL: vi.fn(() => 'blob:mock/0'),
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
                import_label: {name: 'Import 2026-03-17'}
            }
        });

        expect(result.importedCount).toBe(5);
        expect(result.errorCount).toBe(0);
        expect(result.errorList).toEqual([]);
        expect(result.errorCsvName).toBe('Import 2026-03-17 - Errors.csv');
        expect(result.errorCsvUrl).toMatch(/^blob:/);
    });

    it('aggregates and deduplicates errors', () => {
        const result = buildImportResponse({
            meta: {
                stats: {
                    imported: 1,
                    invalid: [
                        {email: 'a@test.com', error: 'Value in [members.email] cannot be blank.'},
                        {email: 'b@test.com', error: 'Value in [members.email] cannot be blank.'},
                        {email: 'c@test.com', error: 'Validation (isEmail) failed for email'}
                    ]
                },
                import_label: {name: 'Test Import'}
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
                        {email: '', error: 'Value in [members.email] cannot be blank.'},
                        {email: 'x', error: 'Value in [members.note] exceeds maximum length of 2000 characters.'},
                        {email: 'y', error: 'Value in [members.subscribed] must be one of true, false, 0 or 1.'},
                        {email: 'z', error: 'Validation (isEmail) failed for email'},
                        {email: 'w', error: 'No such customer:cus_abc123'}
                    ]
                },
                import_label: {name: 'Errors'}
            }
        });

        const messages = result.errorList.map(e => e.message);
        expect(messages).toContain('Missing email address');
        expect(messages).toContain('Note is too long');
        expect(messages).toContain('Value of "Subscribed to emails" must be "true" or "false"');
        expect(messages).toContain('Invalid email address');
        expect(messages).toContain('Could not find Stripe customer');
    });

    it('splits comma-separated errors into separate entries', () => {
        const result = buildImportResponse({
            meta: {
                stats: {
                    imported: 0,
                    invalid: [
                        {email: 'a@test.com', error: 'Value in [members.email] cannot be blank.,Validation (isEmail) failed for email'}
                    ]
                },
                import_label: {name: 'Test'}
            }
        });

        expect(result.errorList).toEqual([
            {message: 'Missing email address', count: 1},
            {message: 'Invalid email address', count: 1}
        ]);
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
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                stats: {imported: 3, invalid: undefined as unknown as any[]}
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
                    invalid: [{email: 'bad', error: 'Validation (isEmail) failed for email'}]
                },
                import_label: {name: 'Test'}
            }
        });

        expect(URL.createObjectURL).toHaveBeenCalledTimes(1);
        const blob = vi.mocked(URL.createObjectURL).mock.calls[0][0] as Blob;
        expect(blob.type).toBe('text/csv');
    });
});
