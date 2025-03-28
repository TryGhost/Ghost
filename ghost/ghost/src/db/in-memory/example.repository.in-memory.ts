/**
 * Repository Implementation
 *
 * Can be in-memory, knex based, bookshelf based, redis based, whatever...
 *
 * No business logic
 * No modification of Entities - they just store what they're given, or fetch what they're asked for
 * They should dispatch and clear the events of an entity when tehy successfully persist it.
 */
import {Inject} from '@nestjs/common';
import {Greeting} from '../../core/example/example.entity';
import {ExampleRepository} from '../../core/example/example.repository';

interface DomainEvents {
    dispatch(event: unknown): void
}

export class ExampleRepositoryInMemory implements ExampleRepository {
    constructor(
        @Inject('DomainEvents') private readonly events: DomainEvents
    ) {}

    async getOne(greeting: string) {
        const entity = new Greeting({
            greeting: greeting.trim()
        });
        return entity;
    }

    async save(entity: Greeting) {
        Greeting.getEventsToDispatch(entity, (events) => {
            for (const event of events) {
                this.events.dispatch(event);
            }
        });
    }
}
