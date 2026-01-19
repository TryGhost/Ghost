import {z} from 'zod';
import errors from '@tryghost/errors';

export interface Frame {
    data: unknown;
    options?: unknown;
}

/** Frame with validated input. frame.data remains raw, frame.input contains transformed data. */
export interface ValidatedFrame<T> extends Frame {
    input: T;
}

export function validateData<T extends z.ZodType>(schema: T, data: unknown): z.output<T> {
    const result = schema.safeParse(data);

    if (!result.success) {
        const issue = result.error.issues[0];
        const path = issue.path.length > 0 ? issue.path.join('.') : undefined;

        throw new errors.ValidationError({
            message: issue.message,
            property: path
        });
    }

    return result.data;
}

/** Creates an API input validator. Sets frame.input to validated/transformed data. */
export function validate<T extends z.ZodType>(schema: T) {
    return async function validator(_apiConfig: unknown, frame: Frame): Promise<void> {
        (frame as ValidatedFrame<z.output<T>>).input = validateData(schema, frame.data);
    };
}
