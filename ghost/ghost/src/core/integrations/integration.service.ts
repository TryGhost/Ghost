import {Integration} from './integration.entity';
import {IntegrationRepository} from './integration.repository';
import {Inject} from '@nestjs/common';

export class IntegrationService {
    constructor(
        // private readonly repository: IntegrationRepository
        @Inject('IntegrationRepository') private readonly repository: IntegrationRepository
    ) {}

    async getOne(slug: string): Promise<Integration> {
        return this.repository.getOne(slug);
    }

    async create(entity: Integration): Promise<Integration> {
        const created = await this.repository.create(entity);
        return created;
    }

    async update(entity: Integration): Promise<Integration> {
        return this.repository.update(entity);
    }

    async getAll(): Promise<Integration[]> {
        // console.log(await this.models.Integration.findAll());
        return this.repository.getAll();
    }
}
