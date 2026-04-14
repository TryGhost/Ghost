/**
 * @typedef {object} SequenceEmailLike
 * @prop {string} id
 * @prop {null | string} next_welcome_email_automated_email_id
 * @prop {Date | string | null | undefined} created_at
 */

/**
 * @param {unknown} model
 * @param {string} field
 * @returns {unknown}
 */
function getField(model, field) {
    if (model && typeof model === 'object' && 'get' in model && typeof model.get === 'function') {
        return model.get(field);
    }

    if (model && typeof model === 'object') {
        return model[field];
    }

    return undefined;
}

/**
 * @param {SequenceEmailLike} model
 * @returns {string}
 */
function getId(model) {
    const id = getField(model, 'id');
    return typeof id === 'string' ? id : '';
}

/**
 * @param {SequenceEmailLike} model
 * @returns {null | string}
 */
function getNextId(model) {
    const nextId = getField(model, 'next_welcome_email_automated_email_id');

    if (typeof nextId === 'string') {
        return nextId;
    }

    return null;
}

/**
 * @param {SequenceEmailLike} model
 * @returns {Date}
 */
function getCreatedAt(model) {
    const createdAt = getField(model, 'created_at');

    if (createdAt instanceof Date) {
        return createdAt;
    }

    if (typeof createdAt === 'string') {
        const date = new Date(createdAt);
        if (!Number.isNaN(date.getTime())) {
            return date;
        }
    }

    return new Date(0);
}

/**
 * @param {SequenceEmailLike} a
 * @param {SequenceEmailLike} b
 * @returns {number}
 */
function compareDeterministic(a, b) {
    const createdAtDelta = getCreatedAt(a).getTime() - getCreatedAt(b).getTime();
    if (createdAtDelta !== 0) {
        return createdAtDelta;
    }

    return getId(a).localeCompare(getId(b));
}

/**
 * Convert linked-list email rows into deterministic order.
 *
 * @template T
 * @param {T[]} emails
 * @returns {T[]}
 */
function orderSequenceEmails(emails) {
    if (!Array.isArray(emails) || emails.length === 0) {
        return [];
    }

    /** @type {Map<string, T>} */
    const byId = new Map();
    /** @type {Map<string, number>} */
    const incomingEdgeCount = new Map();

    for (const email of emails) {
        const id = getId(/** @type {SequenceEmailLike} */(email));
        if (!id) {
            continue;
        }

        byId.set(id, email);
        incomingEdgeCount.set(id, 0);
    }

    for (const email of emails) {
        const nextId = getNextId(/** @type {SequenceEmailLike} */(email));
        if (!nextId || !incomingEdgeCount.has(nextId)) {
            continue;
        }

        incomingEdgeCount.set(nextId, (incomingEdgeCount.get(nextId) || 0) + 1);
    }

    /** @type {Set<string>} */
    const visited = new Set();
    /** @type {T[]} */
    const ordered = [];

    /**
     * @param {string} startId
     */
    const walk = (startId) => {
        let currentId = startId;

        while (currentId && !visited.has(currentId) && byId.has(currentId)) {
            visited.add(currentId);
            const current = byId.get(currentId);
            if (!current) {
                break;
            }

            ordered.push(current);
            currentId = getNextId(/** @type {SequenceEmailLike} */(current)) || '';
        }
    };

    const heads = emails
        .filter((email) => {
            const id = getId(/** @type {SequenceEmailLike} */(email));
            return !!id && (incomingEdgeCount.get(id) || 0) === 0;
        })
        .sort((a, b) => compareDeterministic(
            /** @type {SequenceEmailLike} */(a),
            /** @type {SequenceEmailLike} */(b)
        ));

    for (const head of heads) {
        walk(getId(/** @type {SequenceEmailLike} */(head)));
    }

    const remainder = emails
        .filter(email => !visited.has(getId(/** @type {SequenceEmailLike} */(email))))
        .sort((a, b) => compareDeterministic(
            /** @type {SequenceEmailLike} */(a),
            /** @type {SequenceEmailLike} */(b)
        ));

    for (const email of remainder) {
        walk(getId(/** @type {SequenceEmailLike} */(email)));
    }

    return ordered;
}

module.exports = {
    orderSequenceEmails
};
