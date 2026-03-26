import busboy from 'busboy';
import express from 'express';
import {FakeServer} from '@/helpers/services/fake-server';

export interface SentMessage {
    id: string;
    domain: string;
    from: string;
    to: string[];
    subject: string;
    html: string;
    text: string;
    recipientVariables: Record<string, Record<string, string>>;
    headers: Record<string, string>;
    options: Record<string, string>;
    customVars: Record<string, string>;
    timestamp: Date;
}

interface MailPitAddress {
    Name: string;
    Email: string;
}

interface MailPitSendRequest {
    From: MailPitAddress;
    To: MailPitAddress[];
    Subject: string;
    HTML: string;
    Text: string;
    ReplyTo?: MailPitAddress[];
    Headers?: Record<string, string>;
}

export class FakeMailgunServer extends FakeServer {
    private readonly _messages: SentMessage[] = [];
    private readonly mailpitUrl: string;

    constructor(options: {port?: number; mailpitUrl?: string} = {}) {
        super({port: options.port, debugNamespace: 'e2e:fake-mailgun'});
        this.mailpitUrl = options.mailpitUrl ?? 'http://localhost:8025';
    }

    get messages(): SentMessage[] {
        return [...this._messages];
    }

    clearMessages(): void {
        this._messages.length = 0;
    }

    protected setupRoutes(): void {
        this.app.post('/v3/:domain/messages', (req, res) => {
            this.handleSendMessage(req, res);
        });

        this.app.delete('/v3/:domain/suppressions/:type/:email', (req, res) => {
            this.debug(`Suppression removal: ${req.params.type}/${req.params.email}`);
            res.status(200).json({message: 'Suppression removed'});
        });

        this.app.get('/v3/:domain/events', (_req, res) => {
            res.status(200).json({items: [], paging: {}});
        });

        this.app.use((req, res) => {
            this.debug(`Unhandled route: ${req.method} ${req.originalUrl}`);
            res.status(200).json({message: 'OK'});
        });
    }

    private handleSendMessage(req: express.Request, res: express.Response): void {
        const domain = req.params.domain;
        const fields: Record<string, string | string[]> = {};

        const bb = busboy({headers: req.headers});

        bb.on('field', (name: string, val: string) => {
            if (name in fields) {
                const existing = fields[name];
                if (Array.isArray(existing)) {
                    existing.push(val);
                } else {
                    fields[name] = [existing, val];
                }
            } else {
                fields[name] = val;
            }
        });

        bb.on('close', () => {
            const toField = fields.to;
            const toArray = Array.isArray(toField) ? toField : (typeof toField === 'string' ? toField.split(',').map(e => e.trim()) : []);

            let recipientVariables: Record<string, Record<string, string>> = {};
            try {
                const rvField = fields['recipient-variables'];
                if (typeof rvField === 'string' && rvField) {
                    recipientVariables = JSON.parse(rvField);
                }
            } catch {
                this.debug('Failed to parse recipient-variables');
            }

            const headers: Record<string, string> = {};
            const options: Record<string, string> = {};
            const customVars: Record<string, string> = {};

            for (const [key, value] of Object.entries(fields)) {
                const strValue = Array.isArray(value) ? value.join(', ') : value;
                if (key.startsWith('h:')) {
                    headers[key.slice(2)] = strValue;
                } else if (key.startsWith('o:')) {
                    options[key.slice(2)] = strValue;
                } else if (key.startsWith('v:')) {
                    customVars[key.slice(2)] = strValue;
                }
            }

            const messageId = `<${Date.now()}.${crypto.randomUUID()}@${domain}>`;

            const message: SentMessage = {
                id: messageId,
                domain,
                from: this.getStringField(fields, 'from'),
                to: toArray,
                subject: this.getStringField(fields, 'subject'),
                html: this.getStringField(fields, 'html'),
                text: this.getStringField(fields, 'text'),
                recipientVariables,
                headers,
                options,
                customVars,
                timestamp: new Date()
            };

            this._messages.push(message);
            this.debug(`Stored message ${messageId} to ${toArray.length} recipient(s) in domain ${domain}`);

            this.forwardToMailPit(message).catch((err) => {
                this.debug('Failed to forward to MailPit:', err);
            });

            res.status(200).json({
                id: messageId,
                message: 'Queued. Thank you.'
            });
        });

        bb.on('error', (err: Error) => {
            this.debug('Busboy parse error:', err);
            res.status(400).json({message: 'Failed to parse request'});
        });

        req.pipe(bb);
    }

    private async forwardToMailPit(message: SentMessage): Promise<void> {
        const fromParsed = this.parseEmailAddress(message.from);

        for (const recipientEmail of message.to) {
            const recipientVars = message.recipientVariables[recipientEmail] || {};
            const personalizedHtml = this.resolveRecipientVariables(message.html, recipientVars);
            const personalizedText = this.resolveRecipientVariables(message.text, recipientVars);
            const personalizedSubject = this.resolveRecipientVariables(message.subject, recipientVars);

            // MailPit rejects reserved headers (Reply-To, Sender, etc.) in the
            // generic Headers map — extract them to dedicated fields instead.
            const reservedHeaders = new Set(['Reply-To', 'Sender', 'From', 'To', 'Subject', 'Date']);
            const filteredHeaders: Record<string, string> = {
                'X-Mailgun-Message-Id': message.id
            };
            const replyToAddresses: MailPitAddress[] = [];

            for (const [key, value] of Object.entries(message.headers)) {
                if (key === 'Reply-To' && value) {
                    replyToAddresses.push(this.parseEmailAddress(value));
                } else if (!reservedHeaders.has(key)) {
                    filteredHeaders[key] = value;
                }
            }

            const mailpitPayload: MailPitSendRequest = {
                From: fromParsed,
                To: [{Name: recipientVars.name || '', Email: recipientEmail}],
                Subject: personalizedSubject,
                HTML: personalizedHtml,
                Text: personalizedText,
                ...(replyToAddresses.length > 0 ? {ReplyTo: replyToAddresses} : {}),
                Headers: filteredHeaders
            };

            try {
                const response = await fetch(`${this.mailpitUrl}/api/v1/send`, {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify(mailpitPayload)
                });

                if (!response.ok) {
                    const responseBody = await response.text();
                    this.debug(`MailPit forward failed for ${recipientEmail}: ${response.status} ${responseBody}`);
                } else {
                    this.debug(`Forwarded email to MailPit for ${recipientEmail}`);
                }
            } catch (err) {
                this.debug(`MailPit forward error for ${recipientEmail}:`, err);
            }
        }
    }

    private resolveRecipientVariables(content: string, variables: Record<string, string>): string {
        if (!content) {
            return content;
        }

        return content.replace(/%recipient\.([^%]+)%/g, (_match, varName: string) => {
            return variables[varName] ?? `%recipient.${varName}%`;
        });
    }

    private parseEmailAddress(address: string): MailPitAddress {
        const match = address.match(/^([^<]+)<([^>]+)>$/);
        if (match) {
            return {Name: match[1].trim(), Email: match[2].trim()};
        }

        return {Name: '', Email: address.trim()};
    }

    private getStringField(fields: Record<string, string | string[]>, key: string): string {
        const value = fields[key];
        if (Array.isArray(value)) {
            return value[0] || '';
        }

        return value || '';
    }
}
