import {type FakeMailgunServer, type SentMessage} from './fake-mailgun-server';

export class MailgunTestService {
    private readonly server: FakeMailgunServer;

    constructor(server: FakeMailgunServer) {
        this.server = server;
    }

    getMessages(): SentMessage[] {
        return this.server.messages;
    }

    getLastMessage(): SentMessage | undefined {
        const messages = this.server.messages;
        return messages[messages.length - 1];
    }

    getMessageCount(): number {
        return this.server.messages.length;
    }

    getMessagesForRecipient(email: string): SentMessage[] {
        return this.server.messages.filter(m => m.to.includes(email));
    }

    async waitForMessages(count: number = 1, timeoutMs: number = 30000): Promise<SentMessage[]> {
        const startTime = Date.now();

        while (Date.now() - startTime < timeoutMs) {
            const messages = this.getMessages();
            if (messages.length >= count) {
                return messages;
            }
            await new Promise<void>((resolve) => {
                setTimeout(resolve, 500);
            });
        }

        throw new Error(`Timeout after ${timeoutMs}ms waiting for ${count} Mailgun message(s), got ${this.getMessageCount()}`);
    }

    clearMessages(): void {
        this.server.clearMessages();
    }
}
