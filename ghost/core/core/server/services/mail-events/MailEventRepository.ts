import {MailEvent} from './MailEvent';

export interface MailEventRepository {
    save(event: MailEvent): Promise<void>;
}
