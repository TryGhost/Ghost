import {Integration} from './integration.entity';

export interface IntegrationRepository {
    getOne(slug: string): Promise<Integration>
    create(entity: Integration): Promise<Integration>
    update(entity: Integration): Promise<Integration>
    getAll(): Promise<Integration[]>
}
