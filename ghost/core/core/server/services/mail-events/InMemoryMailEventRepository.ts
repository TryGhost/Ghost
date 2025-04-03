import {InMemoryRepository} from '../lib/InMemoryRepository';
import {MailEvent} from './MailEvent';

export class InMemoryMailEventRepository extends InMemoryRepository<string, MailEvent> {
    protected toPrimitive(): object {
        return {};
    }
}
