import type {CodecContext, FilterField} from './filter-types';

interface ResolvedField {
    definition: FilterField;
    context: CodecContext;
}

function matchPattern(pattern: string, key: string): Record<string, string> | null {
    const patternSegments = pattern.split('.');
    const keySegments = key.split('.');

    if (patternSegments.length !== keySegments.length) {
        return null;
    }

    const params: Record<string, string> = {};

    for (let i = 0; i < patternSegments.length; i += 1) {
        const patternSegment = patternSegments[i];
        const keySegment = keySegments[i];

        if (patternSegment.startsWith(':')) {
            params[patternSegment.slice(1)] = keySegment;
            continue;
        }

        if (patternSegment !== keySegment) {
            return null;
        }
    }

    return params;
}

export function resolveField<TFields extends Record<string, FilterField>>(fields: TFields, key: string, timezone: string): ResolvedField | undefined {
    const exactDefinition = fields[key];

    if (exactDefinition) {
        return {
            definition: exactDefinition,
            context: {
                key,
                pattern: key,
                params: {},
                timezone
            }
        };
    }

    for (const [fieldKey, definition] of Object.entries(fields)) {
        if (!definition.parseKeys?.includes(key)) {
            continue;
        }

        return {
            definition,
            context: {
                key: fieldKey,
                pattern: fieldKey,
                params: {},
                timezone
            }
        };
    }

    for (const [pattern, definition] of Object.entries(fields)) {
        if (!pattern.includes(':')) {
            continue;
        }

        const params = matchPattern(pattern, key);

        if (!params) {
            continue;
        }

        return {
            definition,
            context: {
                key,
                pattern,
                params,
                timezone
            }
        };
    }

    return undefined;
}
