const {ValidationError} = require('@tryghost/errors');
const {slugify} = require('@tryghost/string');

module.exports = class TierSlugService {
    /** @type {import('./TiersAPI').ITierRepository} */
    #repository;

    constructor(deps) {
        this.#repository = deps.repository;
    }

    async validate(slug) {
        const exists = !!(await this.#repository.getBySlug(slug));

        if (!exists) {
            return slug;
        }

        throw new ValidationError({
            message: 'Slug already exists'
        });
    }

    async generate(input, n = 0) {
        const slug = slugify(input + (n ? n : ''));

        try {
            return await this.validate(slug);
        } catch (err) {
            return this.generate(input, n + 1);
        }
    }
};
