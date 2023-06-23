import {InMemoryRepository} from '@tryghost/in-memory-repository';
import {MailEvent} from './MailEvent';

export class InMemoryMailEventRepository extends InMemoryRepository<string, MailEvent> {
    protected toPrimitive(): object {
        return {};
    }
}
