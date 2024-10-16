import {CollectionRepository} from './CollectionRepository';
import {UniqueChecker} from './UniqueChecker';

export class RepositoryUniqueChecker implements UniqueChecker {
    constructor(
        private repository: CollectionRepository
    ) {}

    async isUniqueSlug(slug: string): Promise<boolean> {
        const entity = await this.repository.getBySlug(slug);
        return entity === null;
    }
}
