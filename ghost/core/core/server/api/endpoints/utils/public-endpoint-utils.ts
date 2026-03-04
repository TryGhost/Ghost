import {mapQuery} from '@tryghost/mongo-utils';

const PRIVATE_USER_FIELDS = new Set([
    'password',
    'email'
]);

export const rejectPrivateFieldsTransformer = (input: unknown) => mapQuery(input, function (value: unknown, key: string) {
    const fieldName = key.toLowerCase().split('.').pop()!;
    if (PRIVATE_USER_FIELDS.has(fieldName)) {
        return;
    }

    return {
        [key]: value
    };
});
