import type {Ajv} from 'ajv';

export function addIsLowercaseKeyword(ajv: Ajv): Ajv {
    ajv.addKeyword({
        keyword: 'isLowercase',
        type: 'string',
        schemaType: 'boolean',
        errors: false,
        validate: (_schema: boolean, data: string) => data === data.toLowerCase()
    });

    return ajv;
}
