import {MailEvent} from './MailEvent';
import {MailEventRepository} from './MailEventRepository';

export class InMemoryMailEventRepository implements MailEventRepository {
    constructor(
        readonly events: MailEvent[] = []
    ) {}

    async save(event: MailEvent): Promise<void> {
        this.events.push(event);
    }
}
