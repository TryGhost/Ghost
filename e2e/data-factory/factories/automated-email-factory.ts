import {Factory} from '@/data-factory';
import {generateId} from '@/data-factory';

export interface AutomatedEmail {
    id: string;
    status: 'active' | 'inactive';
    name: string;
    slug: string;
    subject: string;
    lexical: string;
    sender_name: string | null;
    sender_email: string | null;
    sender_reply_to: string | null;
    created_at: Date;
    updated_at: Date | null;
}

export class AutomatedEmailFactory extends Factory<Partial<AutomatedEmail>, AutomatedEmail> {
    entityType = 'automated_emails';

    build(options: Partial<AutomatedEmail> = {}): AutomatedEmail {
        const now = new Date();

        const defaults: AutomatedEmail = {
            id: generateId(),
            status: 'active',
            name: 'Welcome Email (Free)',
            slug: 'member-welcome-email-free',
            subject: 'Welcome to {site_title}!',
            lexical: JSON.stringify(this.defaultLexicalContent()),
            sender_name: null,
            sender_email: null,
            sender_reply_to: null,
            created_at: now,
            updated_at: null
        };

        return {...defaults, ...options} as AutomatedEmail;
    }

    private defaultLexicalContent() {
        return {
            root: {
                children: [{
                    type: 'paragraph',
                    children: [{
                        type: 'text',
                        text: 'Welcome to {site_title}!'
                    }]
                }],
                direction: null,
                format: '',
                indent: 0,
                type: 'root',
                version: 1
            }
        };
    }
}

