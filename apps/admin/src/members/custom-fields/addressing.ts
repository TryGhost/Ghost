import {escapeNqlString} from '@tryghost/nql-string';
import {keyBelow, PRESENCE_OPERATORS, getCompoundChildren, readNegatedString, toComparator} from '@/shared/filters';
import type {CompoundMatch, PresenceAddressing} from '@/shared/filters';

const RELATION = 'custom_fields';
const KEY_ATTRIBUTE = `${RELATION}.key`;
const VALUE_ATTRIBUTE = `${RELATION}.value`;
const PATH_ATTRIBUTE = `${RELATION}.path`;

export const CUSTOM_FIELD_KEY_PREFIX = 'custom_fields.';

export const CUSTOM_FIELD_SET_OPERATORS = PRESENCE_OPERATORS;

function keyClause(fieldKey: string): string {
    return `${KEY_ATTRIBUTE}:${escapeNqlString(fieldKey)}`;
}

function readValues(values: unknown[]): {subfield: string; value: unknown} {
    const [subfield, value] = values;

    return {
        subfield: typeof subfield === 'string' ? subfield : '',
        value
    };
}

export function customFieldAddressing(boundKey?: string): PresenceAddressing {
    return {
        presenceOperators: CUSTOM_FIELD_SET_OPERATORS,

        address(predicate, ctx) {
            const fieldKey = boundKey ?? ctx.params.key;
            const {subfield, value} = readValues(predicate.values);

            if (!fieldKey) {
                return null;
            }

            return {
                valueKey: subfield ? `${VALUE_ATTRIBUTE}.${subfield}` : VALUE_ATTRIBUTE,
                companions: [keyClause(fieldKey)],
                values: [value]
            };
        },

        // The shape of these clauses is not ours to choose. The members API rewrites them into a
        // single lookup over the rows holding custom field values, and it only accepts two forms:
        // a lone key clause, or a key clause grouped with one path or value clause. See
        // ghost/core/core/server/services/members-custom-fields/filter.ts.
        //
        // A minus sign inside the group also negates the whole lookup, so `key:'x'+path:-'country'`
        // asks for members with no x/country value at all, not for one whose part is something
        // else. Anything else is either a 400 or a quietly wrong set of members.
        addressPresence(predicate, ctx) {
            const fieldKey = boundKey ?? ctx.params.key;
            const {subfield} = readValues(predicate.values);

            if (!fieldKey) {
                return null;
            }

            if (predicate.operator === 'is-set') {
                return subfield
                    ? [`(${keyClause(fieldKey)}+${PATH_ATTRIBUTE}:${escapeNqlString(subfield)})`]
                    : [keyClause(fieldKey)];
            }

            return subfield
                ? [`(${keyClause(fieldKey)}+${PATH_ATTRIBUTE}:-${escapeNqlString(subfield)})`]
                : [`${KEY_ATTRIBUTE}:-${escapeNqlString(fieldKey)}`];
        },

        match() {
            return null;
        },

        matchCompound(node): CompoundMatch | null {
            const children = getCompoundChildren(node, '$and');

            if (!children) {
                const keyValue = node[KEY_ATTRIBUTE];

                if (typeof keyValue === 'string') {
                    return {kind: 'predicate', predicate: {field: `${CUSTOM_FIELD_KEY_PREFIX}${keyValue}`, operator: 'is-set', values: ['', '']}};
                }

                const negatedKey = readNegatedString(keyValue);

                if (negatedKey !== null) {
                    return {kind: 'predicate', predicate: {field: `${CUSTOM_FIELD_KEY_PREFIX}${negatedKey}`, operator: 'is-not-set', values: ['', '']}};
                }

                return null;
            }

            if (children.length !== 2) {
                return null;
            }

            let fieldKey: string | undefined;
            let valueEntry: {subfield: string; raw: unknown} | undefined;
            let pathEntry: {subfield: string; negated: boolean} | undefined;

            for (const child of children) {
                if (typeof child[KEY_ATTRIBUTE] === 'string') {
                    fieldKey = child[KEY_ATTRIBUTE];
                }

                for (const childKey of Object.keys(child)) {
                    if (childKey === VALUE_ATTRIBUTE) {
                        valueEntry = {subfield: '', raw: child[childKey]};
                    } else if (keyBelow(childKey, VALUE_ATTRIBUTE)) {
                        valueEntry = {subfield: keyBelow(childKey, VALUE_ATTRIBUTE) ?? '', raw: child[childKey]};
                    } else if (childKey === PATH_ATTRIBUTE) {
                        const raw = child[childKey];
                        const negatedPath = readNegatedString(raw);

                        if (typeof raw === 'string') {
                            pathEntry = {subfield: raw, negated: false};
                        } else if (negatedPath !== null) {
                            pathEntry = {subfield: negatedPath, negated: true};
                        }
                    }
                }
            }

            if (!fieldKey) {
                return null;
            }

            if (pathEntry) {
                return {
                    kind: 'predicate',
                    predicate: {
                        field: `${CUSTOM_FIELD_KEY_PREFIX}${fieldKey}`,
                        operator: pathEntry.negated ? 'is-not-set' : 'is-set',
                        values: [pathEntry.subfield, '']
                    }
                };
            }

            if (!valueEntry) {
                return null;
            }

            const comparator = toComparator(valueEntry.raw);

            if (!comparator) {
                return null;
            }

            return {
                kind: 'value',
                field: `${CUSTOM_FIELD_KEY_PREFIX}${fieldKey}`,
                leadingValues: [valueEntry.subfield],
                comparator
            };
        }
    };
}
