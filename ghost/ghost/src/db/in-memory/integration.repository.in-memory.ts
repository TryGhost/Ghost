import {Inject} from '@nestjs/common';
import {Integration} from '../../core/integrations/integration.entity';
import {IntegrationRepository} from '../../core/integrations/integration.repository';

interface DomainEvents {
    dispatch(event: unknown): void
}

export class IntegrationRepositoryInMemory implements IntegrationRepository {
    constructor(
        @Inject('DomainEvents') private readonly events: DomainEvents
    ) {}

    async getOne(slug: string) {
        const entity = new Integration({
            type: 'internal',
            name: 'test',
            slug: slug,
            icon_image: null,
            api_keys: [],
            description: null,
            webhooks: []
        });
        return entity;
    }

    async create(entity: Integration) {
        Integration.getEventsToDispatch(entity, (events) => {
            for (const event of events) {
                this.events.dispatch(event);
            }
        });
        return entity;
    }

    async update(entity: Integration) {
        Integration.getEventsToDispatch(entity, (events) => {
            for (const event of events) {
                this.events.dispatch(event);
            }
        });
        return entity;
    }

    async getAll() {
        return [];
    }
}
