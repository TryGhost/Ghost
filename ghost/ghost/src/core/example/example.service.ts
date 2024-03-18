/**
 * Service
 *
 * These implement Use Cases of the system, they should use repositories, entities and other services to coordinate these Use Cases
 *
 * Business logic should only go in here if it does not fall in the domain of a single entity.
 */
import {Inject} from '@nestjs/common';
import {ExampleRepository} from './example.repository';

export class ExampleService {
    constructor(
        @Inject('ExampleRepository') private readonly repository: ExampleRepository
    ) {}

    async greet(recipient: string): Promise<string> {
        const greeting = await this.repository.getOne('Greetings');

        const message = greeting.greet(recipient);

        await this.repository.save(greeting);

        return message;
    }
}
