/**
 * Cursor utilities for keyset pagination of comments.
 *
 * Cursors are opaque base64-encoded JSON objects containing the sort key
 * values needed to resume pagination from a specific position.
 */

/**
 * @typedef {Object} ParsedOrder
 * @property {string} field - Column name (e.g. 'created_at', 'count__likes')
 * @property {'asc'|'desc'} direction - Sort direction
 */

/**
 * Parse an order string like "created_at DESC, id DESC" into structured form.
 * @param {string} orderString
 * @returns {ParsedOrder[]}
 */
function parseOrder(orderString) {
    if (!orderString) {
        return [];
    }

    return orderString.split(',').map((part) => {
        const trimmed = part.trim();
        const [field, dir] = trimmed.split(/\s+/);
        return {
            field: field.toLowerCase(),
            direction: (dir || 'asc').toLowerCase() === 'desc' ? 'desc' : 'asc'
        };
    });
}

/**
 * Ensure the order includes `id` as a tiebreaker. If `id` is not present,
 * append it with the same direction as the last sort field.
 * @param {ParsedOrder[]} order
 * @returns {ParsedOrder[]}
 */
function ensureIdTiebreaker(order) {
    if (order.length === 0) {
        return [{field: 'id', direction: 'desc'}];
    }

    const hasId = order.some(o => o.field === 'id');
    if (hasId) {
        return order;
    }

    const lastDirection = order[order.length - 1].direction;
    return [...order, {field: 'id', direction: lastDirection}];
}

/**
 * Encode cursor values into an opaque base64 string.
 * @param {Record<string, any>} values - Sort key values (e.g. { created_at: '...', id: '...' })
 * @returns {string}
 */
function encodeCursor(values) {
    const json = JSON.stringify(values);
    return Buffer.from(json, 'utf8').toString('base64url');
}

/**
 * Decode a cursor string back into sort key values.
 * @param {string} cursor - Base64-encoded cursor
 * @returns {Record<string, any>}
 * @throws {Error} If the cursor is malformed
 */
function decodeCursor(cursor) {
    try {
        const json = Buffer.from(cursor, 'base64url').toString('utf8');
        const values = JSON.parse(json);

        if (typeof values !== 'object' || values === null || Array.isArray(values)) {
            throw new Error('Invalid cursor: must decode to an object');
        }

        return values;
    } catch (err) {
        if (err.message.startsWith('Invalid cursor')) {
            throw err;
        }
        throw new Error('Invalid cursor: could not decode');
    }
}

/**
 * Build a keyset WHERE clause for cursor pagination.
 *
 * For an order of [a DESC, b DESC, id DESC] with direction 'after':
 *   WHERE (a < :a) OR (a = :a AND b < :b) OR (a = :a AND b = :b AND id < :id)
 *
 * For 'before' direction, the comparisons are flipped.
 *
 * @param {Record<string, any>} cursorValues - Decoded cursor values
 * @param {ParsedOrder[]} order - Parsed order with id tiebreaker
 * @param {'after'|'before'} direction - Pagination direction
 * @returns {{sql: string, bindings: any[]}} Raw SQL clause and bindings
 */
function buildKeysetCondition(cursorValues, order, direction) {
    // For 'after' pagination, we want items that come after the cursor in sort order.
    // For DESC ordering, "after" means values less than the cursor.
    // For ASC ordering, "after" means values greater than the cursor.
    // For 'before' pagination, it's the opposite.
    const conditions = [];
    const bindings = [];

    for (let i = 0; i < order.length; i++) {
        const parts = [];
        const partBindings = [];

        // All preceding columns must be equal
        for (let j = 0; j < i; j++) {
            const col = columnExpression(order[j].field);
            parts.push(`${col} = ?`);
            partBindings.push(cursorValues[order[j].field]);
        }

        // The current column uses a comparison operator
        const col = columnExpression(order[i].field);
        const op = getComparisonOp(order[i].direction, direction);
        parts.push(`${col} ${op} ?`);
        partBindings.push(cursorValues[order[i].field]);

        conditions.push(`(${parts.join(' AND ')})`);
        bindings.push(...partBindings);
    }

    return {
        sql: conditions.join(' OR '),
        bindings
    };
}

/**
 * Get the comparison operator for a keyset condition.
 * @param {'asc'|'desc'} sortDirection
 * @param {'after'|'before'} paginationDirection
 * @returns {string}
 */
function getComparisonOp(sortDirection, paginationDirection) {
    // after + desc => items with SMALLER values (they come after in desc order)
    // after + asc => items with LARGER values (they come after in asc order)
    // before + desc => items with LARGER values (they come before in desc order)
    // before + asc => items with SMALLER values (they come before in asc order)
    if (
        (sortDirection === 'desc' && paginationDirection === 'after') ||
        (sortDirection === 'asc' && paginationDirection === 'before')
    ) {
        return '<';
    }
    return '>';
}

/**
 * Get the SQL column expression for a field. Computed fields like count__likes
 * need special handling since they are subquery aliases.
 * @param {string} field
 * @returns {string}
 */
function columnExpression(field) {
    // count__* fields are computed column aliases from countRelations()
    // In the WHERE clause, we reference them via the same subquery pattern
    // But in practice, MySQL doesn't allow referencing SELECT aliases in WHERE,
    // so we use the same subquery directly. For now, we use the table-qualified
    // column name or the alias since Ghost's Bookshelf pipeline adds these as
    // selected columns. The actual subquery injection happens in the model.
    if (field === 'id') {
        return 'comments.id';
    }
    if (field === 'created_at') {
        return 'comments.created_at';
    }
    // For count__likes and similar computed fields, these need to be injected
    // as subqueries by the caller. Return the field name as-is — the model
    // layer will handle replacing it with the appropriate subquery.
    return field;
}

/**
 * Extract cursor values from a model instance based on the sort order.
 * @param {Object} model - Bookshelf model instance
 * @param {ParsedOrder[]} order - Parsed order with id tiebreaker
 * @returns {Record<string, any>}
 */
function extractCursorValues(model, order) {
    const values = {};
    for (const {field} of order) {
        const value = model.get(field) ?? model.attributes[field];
        if (field === 'created_at' && value instanceof Date) {
            values[field] = value.toISOString();
        } else {
            values[field] = value;
        }
    }
    return values;
}

module.exports = {
    parseOrder,
    ensureIdTiebreaker,
    encodeCursor,
    decodeCursor,
    buildKeysetCondition,
    extractCursorValues
};
