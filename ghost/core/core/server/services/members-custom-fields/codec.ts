import {z} from 'zod';
import {camelKeys, snakeKeys} from '../../lib/case-keys';
import {DbCustomField} from './schema';
import {CustomField} from './models';

// Maps a member_custom_fields row to/from the domain CustomField (snake_case to
// camelCase; DbDate decoding happens in DbCustomField).
export const customFieldCodec = z.codec(DbCustomField, CustomField, {
    // camelKeys types `type` as string; CustomField narrows it to the enum at
    // runtime (the DB only stores registered types).
    decode: row => camelKeys(row) as z.input<typeof CustomField>,
    encode: field => snakeKeys(field)
});
