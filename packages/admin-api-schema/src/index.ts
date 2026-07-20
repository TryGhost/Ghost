import errors from '@tryghost/errors';
import {actionSchemaNames, schemas, type SchemaName} from './schemas/index.js';
import {validate as validateJSONSchema, type IdentifiedSchema} from './utils/json-schema.js';

export type {SchemaName};

export interface ValidateOptions {
    data: unknown;
    schema?: string;
    definition?: string;
}

function isSchemaName(name: string): name is SchemaName {
    return Object.hasOwn(schemas, name);
}

export function get(name: string | undefined): IdentifiedSchema | null {
    if (!name || !isSchemaName(name)) {
        return null;
    }

    return schemas[name];
}

export function list(): SchemaName[] {
    return [...actionSchemaNames];
}

export function validate({data, schema, definition = schema?.split('-')[0]}: ValidateOptions): Promise<void> {
    const schemaJSON = get(schema);

    if (!schemaJSON) {
        throw new errors.IncorrectUsageError({
            message: 'Cannot find schema for provided definition name.',
            context: `Definition for ${schema} does not exist.`
        });
    }

    const definitionJSON = get(definition);

    if (!definitionJSON) {
        throw new errors.IncorrectUsageError({
            message: 'Cannot find schema for provided definition name.',
            context: `Definition for ${definition} does not exist.`
        });
    }

    return validateJSONSchema(schemaJSON, definitionJSON, data);
}

export default {get, list, validate};
