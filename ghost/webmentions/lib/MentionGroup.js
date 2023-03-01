/**
 * @typedef {import('./Mention')} Mention
 */

module.exports = class MentionGroup {
    /** @type {Mention[]} */
    #mentions;
    get mentions() {
        return this.#mentions;
    }

    toJSON() {
        return {
            mentions: this.#mentions.map(mention => mention.toJSON())
        };
    }

    /** @private */
    constructor(data) {
        this.#mentions = data.mentions;
    }

    /**
     * @param {any} data
     * @returns {Promise<Mention>}
     */
    static async create(data) {
        const mentionGroup = new MentionGroup({
            mentions: data.mentions ?? []
        });

        return mentionGroup;
    }
};
