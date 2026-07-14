import {Factory} from '@/data-factory';
import {tag} from '@tryghost/test-data';
import type {Tag} from '@tryghost/test-data';

export type {Tag};

/**
 * Persistence-aware wrapper around the shared `@tryghost/test-data` tag
 * builder: entity shape and defaults live in the package, this class only adds
 * the e2e persistence lane (create/createMany via a PersistenceAdapter).
 */
export class TagFactory extends Factory<Partial<Tag>, Tag> {
    entityType = 'tags';

    build(options: Partial<Tag> = {}): Tag {
        return tag(options);
    }
}
