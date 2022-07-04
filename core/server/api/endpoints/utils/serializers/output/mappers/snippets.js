/**
 * @param {import('bookshelf').Model} snippet
 * @param {Frame} frame
 *
 * @returns {SerializedSnippet}
 */
module.exports = (snippet, frame) => {
    const json = snippet.toJSON(frame.options);

    return {
        id: json.id,
        name: json.name,
        // @ts-ignore
        mobiledoc: json.mobiledoc,
        created_at: json.created_at,
        updated_at: json.updated_at,
        created_by: json.created_by,
        updated_by: json.updated_by
    };
};

/**
 * @typedef {Object} SerializedSnippet
 * @prop {string} id
 * @prop {string=} name
 * @prop {string=} mobiledoc
 * @prop {string} created_at
 * @prop {string} updated_at
 * @prop {string} created_by
 * @prop {string} updated_by
 */

/**
 * @typedef {Object<string, any>} Frame
 * @prop {Object} options
 */
