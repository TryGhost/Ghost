/**
 * In-memory implementation of the redirects store contract. Used to
 * validate the contract suite against a known-good reference and as a
 * test double for higher-level service tests where filesystem or
 * network IO would be incidental.
 *
 * @implements {import('../../../../../../core/server/services/custom-redirects/types').RedirectsStore}
 */
class InMemoryStore {
    constructor() {
        /** @type {import('../../../../../../core/server/services/custom-redirects/types').RedirectConfig[]} */
        this.redirects = [];
    }

    async getAll() {
        return this.redirects.map(r => ({...r}));
    }

    async replaceAll(redirects) {
        this.redirects = redirects.map(r => ({...r}));
    }
}

module.exports = InMemoryStore;
