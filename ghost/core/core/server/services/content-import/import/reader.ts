import {parse as parseCSV} from '../csv';
import {postImportRowSchema, type PostImportRow} from './row';

// Identity map until the field-mapping milestone adds caller-supplied mappings.
const FIELD_BY_HEADER: Record<string, string> = {
    title: 'title',
    html: 'html',
    published_at: 'published_at'
};

export default async function readPostRows(path: string): Promise<PostImportRow[]> {
    const rows = await parseCSV(path, FIELD_BY_HEADER);
    return rows.map(row => postImportRowSchema.parse(row));
}
