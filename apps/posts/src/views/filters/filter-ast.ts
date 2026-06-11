export type AstNode = Record<string, unknown>;

function isPlainObject(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value) && !(value instanceof RegExp);
}

export function extractFieldName(node: AstNode): string | undefined {
    const keys = Object.keys(node);

    if (keys.length !== 1) {
        return undefined;
    }

    const [field] = keys;

    if (field.startsWith('$')) {
        return undefined;
    }

    return field;
}

/**
 * Returns the top-level AND clauses of a parsed filter. A filter without a
 * root `$and` is a single clause. Parenthesized groups stay intact as one
 * clause because the parser nests them as a single child node.
 */
export function extractAndClauses(node: AstNode): AstNode[] {
    if (Array.isArray(node.$and)) {
        return node.$and.filter(isPlainObject);
    }

    return [node];
}

// Mirrors the lexer: a bare (unquoted) literal must not collide with the
// keyword, number, or relative-date token forms, and may only use characters
// the LITERAL rule accepts without escaping.
const BARE_LITERAL = /^[a-zA-Z_][\w.@-]*$/;
const KEYWORD_LITERALS = new Set(['true', 'false', 'null']);
const RELATIVE_DATE_LITERAL = /^now[-+]\d+[dwMyhms]$/;
const FIELD_KEY = /^[a-zA-Z_][a-zA-Z0-9_.]*$/;

const COMPARISON_PREFIXES: Record<string, string> = {
    $ne: '-',
    $gt: '>',
    $lt: '<',
    $gte: '>=',
    $lte: '<='
};

// Inverts scope.relDateToAbsolute's `preserveRelativeDates` output.
const RELATIVE_DATE_UNITS: Record<string, string> = {
    days: 'd',
    weeks: 'w',
    months: 'M',
    years: 'y',
    hours: 'h',
    minutes: 'm',
    seconds: 's'
};

// The characters scope.stringToRegExp escapes when building a RegExp.
const REGEX_ESCAPED_CHARS = '.*+?^$(){}|[]\\';

function quoteString(value: string): string {
    return `'${value.replace(/(['"])/g, '\\$1')}'`;
}

function serializeString(value: string): string | undefined {
    if (value.length === 0) {
        return undefined;
    }

    if (BARE_LITERAL.test(value) && !KEYWORD_LITERALS.has(value.toLowerCase()) && !RELATIVE_DATE_LITERAL.test(value)) {
        return value;
    }

    return quoteString(value);
}

function serializeRelativeDate(value: Record<string, unknown>): string | undefined {
    const {op, amount, unit} = value as {op?: unknown; amount?: unknown; unit?: unknown};
    const sign = op === 'add' ? '+' : op === 'sub' ? '-' : undefined;
    const unitLetter = typeof unit === 'string' ? RELATIVE_DATE_UNITS[unit] : undefined;

    if (!sign || !unitLetter || typeof amount !== 'number' || !Number.isInteger(amount) || amount < 0) {
        return undefined;
    }

    return `now${sign}${amount}${unitLetter}`;
}

function serializeScalar(value: unknown): string | undefined {
    if (value === null) {
        return 'null';
    }

    if (typeof value === 'boolean') {
        return String(value);
    }

    if (typeof value === 'number') {
        // Negative numbers have no literal form: `field:-5` parses as $ne.
        return Number.isInteger(value) && value >= 0 ? String(value) : undefined;
    }

    if (typeof value === 'string') {
        return serializeString(value);
    }

    if (isPlainObject(value) && isPlainObject(value.$relativeDate)) {
        return serializeRelativeDate(value.$relativeDate);
    }

    return undefined;
}

/**
 * Recovers the `~`/`~^`/`~$` form from a RegExp built by scope.stringToRegExp.
 * Anything that couldn't have come from it (other flags, unescaped regex
 * syntax, both anchors) is unserializable.
 */
function serializeRegex(value: unknown, negated: boolean): string | undefined {
    if (!(value instanceof RegExp) || value.flags !== 'i') {
        return undefined;
    }

    const source = value.source;
    let literal = '';
    let startAnchor = false;
    let endAnchor = false;

    for (let index = 0; index < source.length; index += 1) {
        const char = source[index];

        if (char === '\\') {
            const next = source[index + 1];

            if (next === undefined || !REGEX_ESCAPED_CHARS.includes(next)) {
                return undefined;
            }

            literal += next;
            index += 1;
        } else if (char === '^' && index === 0) {
            startAnchor = true;
        } else if (char === '$' && index === source.length - 1) {
            endAnchor = true;
        } else if (REGEX_ESCAPED_CHARS.includes(char)) {
            return undefined;
        } else {
            literal += char;
        }
    }

    if ((startAnchor && endAnchor) || literal.length === 0) {
        return undefined;
    }

    const operator = startAnchor ? '~^' : endAnchor ? '~$' : '~';

    return `${negated ? '-' : ''}${operator}${quoteString(literal)}`;
}

function serializeInList(values: unknown, negated: boolean): string | undefined {
    if (!Array.isArray(values) || values.length === 0) {
        return undefined;
    }

    const parts = values.map(serializeScalar);

    if (parts.some(part => part === undefined)) {
        return undefined;
    }

    return `${negated ? '-' : ''}[${parts.join(',')}]`;
}

function serializeValueExpr(value: unknown): string | undefined {
    if (isPlainObject(value)) {
        if (isPlainObject(value.$relativeDate)) {
            return serializeScalar(value);
        }

        const entries = Object.entries(value);

        if (entries.length !== 1) {
            return undefined;
        }

        const [operator, operand] = entries[0];

        if (operator === '$regex') {
            return serializeRegex(operand, false);
        }

        if (operator === '$not') {
            return serializeRegex(operand, true);
        }

        if (operator === '$in') {
            return serializeInList(operand, false);
        }

        if (operator === '$nin') {
            return serializeInList(operand, true);
        }

        const prefix = COMPARISON_PREFIXES[operator];

        if (!prefix) {
            return undefined;
        }

        const scalar = serializeScalar(operand);

        return scalar === undefined ? undefined : `${prefix}${scalar}`;
    }

    return serializeScalar(value);
}

function serializeNode(node: unknown, isRoot: boolean): string | undefined {
    if (!isPlainObject(node)) {
        return undefined;
    }

    // Double-parenthesized groups can leave a `yg` wrapper in the AST.
    const unwrapped = isPlainObject(node.yg) ? node.yg : node;
    const keys = Object.keys(unwrapped);

    if (keys.length !== 1) {
        return undefined;
    }

    const [key] = keys;

    if (key === '$and' || key === '$or') {
        const children = unwrapped[key];

        if (!Array.isArray(children) || children.length === 0) {
            return undefined;
        }

        const parts = children.map(child => serializeNode(child, false));

        if (parts.some(part => part === undefined)) {
            return undefined;
        }

        const joined = parts.join(key === '$and' ? '+' : ',');

        return isRoot ? joined : `(${joined})`;
    }

    if (!FIELD_KEY.test(key)) {
        return undefined;
    }

    const valueText = serializeValueExpr(unwrapped[key]);

    return valueText === undefined ? undefined : `${key}:${valueText}`;
}

/**
 * Serializes a parsed AST node back to NQL. The inverse of nql-lang's parser
 * for every shape it can emit; returns undefined for anything it can't
 * faithfully round-trip, so callers can drop the clause rather than corrupt
 * it. OR groups are parenthesized except at the root, where bare OR is valid.
 */
export function serializeAstToNql(node: AstNode): string | undefined {
    return serializeNode(node, true);
}

export function extractComparator(node: AstNode): {field: string; operator: string; value: unknown} | undefined {
    const field = extractFieldName(node);

    if (!field) {
        return undefined;
    }

    const value = node[field];

    if (isPlainObject(value)) {
        const entries = Object.entries(value);

        if (entries.length !== 1) {
            return undefined;
        }

        const [operator, comparatorValue] = entries[0];
        return {field, operator, value: comparatorValue};
    }

    return {
        field,
        operator: '$eq',
        value
    };
}
