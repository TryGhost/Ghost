import MailEvent from './MailEvent';

interface ModelAttributes {
    id: string;
    type: string;
    message_id: string;
    recipient: string;
    occurred_at: Date;
}

interface Model {
    add(attributes: ModelAttributes): Model;
}

export default class MailEventRepository {
    constructor(private model: Model) {}

    async persist(event: MailEvent) {
        return this.model.add({
            id: event.id,
            type: event.type,
            message_id: event.messageId,
            recipient: event.recipient,
            occurred_at: new Date(event.timestampMs)
        });
    }
}
