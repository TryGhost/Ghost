import Service, {inject as service} from '@ember/service';
import {set} from '@ember/object';
import {tracked} from '@glimmer/tracking';

let counter = 0;
function getFakeNewsletter() {
    counter += 1;
    return {
        id: Math.floor(Math.random() * 1e9),
        name: 'Daily roundup ' + counter,
        description: 'Daily news delivered to your inbox every morning.',
        sender_name: 'Test',
        sender_email: 'test@example.com',
        sender_reply_to: 'test@example.com',
        default: false,
        status: 'active',
        recipient_filter: '',
        subscribe_on_signup: true,
        sort_order: counter,
        members: {
            total: Math.floor(Math.random() * 100)
        },
        posts: {
            total: Math.floor(Math.random() * 100)
        }
    };
}

export default class NewslettersService extends Service {
    @service config;
    @service settings;
    @service feature;
    @service store;

    @tracked
    newsletters = [
        {
            id: '123',
            name: 'Daily roundup',
            description: 'Daily news delivered to your inbox every morning.',
            sender_name: 'Test',
            sender_email: 'test@example.com',
            sender_reply_to: 'test@example.com',
            default: true,
            status: 'active',
            recipient_filter: '',
            subscribe_on_signup: true,
            sort_order: 0,
            members: {
                total: 19
            },
            posts: {
                total: 17
            }
        },
        {
            id: '456',
            name: ' Weekly summary ',
            description: 'Get the weekly highlights every Sunday.',
            sender_name: 'Test',
            sender_email: 'test@example.com',
            sender_reply_to: 'test@example.com',
            default: true,
            status: 'active',
            recipient_filter: '',
            subscribe_on_signup: true,
            sort_order: 0,
            members: {
                total: 32
            },
            posts: {
                total: 2
            }
        }
    ]

    add() {
        this.newsletters.push(getFakeNewsletter());
        this.newsletters.sort((a,b) => a.sort_order - b.sort_order);
        this.newsletters = [...this.newsletters]; //trigger UI refresh
        return this.newsletters;
    }

    archive(newsletterId) {
        const newsletter = this.newsletters.find(n => n.id === newsletterId);
        if (newsletter) {
            set(newsletter, 'status', 'archived');
        }
    }

    unArchive(newsletterId) {
        const newsletter = this.newsletters.find(n => n.id === newsletterId);
        if (newsletter) {
            set(newsletter, 'status', 'active');
        }
    }
}
