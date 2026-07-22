import {z} from 'zod';
import {camelKeys, snakeKeys} from '../../lib/case-keys';
import {DbCustomField} from './schema';
import {CustomField} from './models';

// Maps a members_custom_fields row to/from the domain CustomField (snake_case to
// camelCase; DbDate decoding happens in DbCustomField).
export const customFieldCodec = z.codec(DbCustomField, CustomField, {
    // DbCustomField validates `type` as the field-type enum, so the decoded row
    // already carries a FieldType and camelKeys preserves it — no cast needed.
    decode: row => camelKeys(row),
    encode: field => snakeKeys(field)
});
