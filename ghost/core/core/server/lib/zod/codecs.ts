import {z} from 'zod';

/** Lenient ISO datetime string - uses Date.parse to accept various valid formats */
export const isoDatetimeString = z.string().refine(
    s => !isNaN(Date.parse(s)),
    {message: 'Invalid datetime string'}
);

export const isoDatetime = z.codec(
    isoDatetimeString,
    z.date(),
    {
        decode: iso => new Date(iso),
        encode: date => date.toISOString()
    }
);

export const nullableIsoDatetime = z.codec(
    isoDatetimeString.nullable(),
    z.date().nullable(),
    {
        decode: iso => (iso ? new Date(iso) : null),
        encode: date => date?.toISOString() ?? null
    }
);

/** JSON string codec with proper Zod error reporting. */
export const JsonStringCodec = z.codec(
    z.string(),
    z.json(),
    {
        decode: (str, ctx) => {
            try {
                return JSON.parse(str);
            } catch (err: unknown) {
                ctx.issues.push({
                    input: str,
                    code: 'custom',
                    message: err instanceof Error ? err.message : 'Invalid JSON'
                });
                return z.NEVER;
            }
        },
        encode: data => JSON.stringify(data)
    }
);
