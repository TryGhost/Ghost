/**
 * Repository
 *
 * These define how the service can retrieve and store entities to/from persistence
 *
 * They should generally be derived from a shared base interface
 */
import {Greeting} from './example.entity';

export interface ExampleRepository {
    getOne(recipient: string): Promise<Greeting>
    save(entity: Greeting): Promise<void>
}
