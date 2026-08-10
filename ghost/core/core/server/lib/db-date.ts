import {z} from 'zod';

// A zod codec for datetime columns: MySQL returns a Date, SQLite a string/number;
// normalise to a Date on read and pass a Date through on write.
export const DbDate = z.codec(z.union([z.date(), z.string(), z.number()]), z.date(), {
    decode: value => new Date(value),
    encode: date => date
});
