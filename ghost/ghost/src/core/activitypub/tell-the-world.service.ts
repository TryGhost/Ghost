import {Inject} from '@nestjs/common';
import {Activity} from './activity.entity';
import {Actor} from './actor.entity';

export class TheWorld {
    constructor(
        @Inject('ActivityPubBaseURL') private readonly url: URL
    ) {}

    async deliverActivity(activity: Activity, actor: Actor): Promise<void> {
        const recipients = await this.getRecipients(activity);
        for (const recipient of recipients) {
            const data = await this.fetchForActor(recipient.href, actor);
            if ('inbox' in data && typeof data.inbox === 'string') {
                const inbox = new URL(data.inbox);
                await this.sendActivity(inbox, activity, actor);
            }
        }
    }

    private async sendActivity(to: URL, activity: Activity, from: Actor) {
        const request = new Request(to.href, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/ld+json'
            },
            body: JSON.stringify(activity.getJSONLD(this.url))
        });
        const signedRequest = await from.sign(request, this.url);
        await fetch(signedRequest);
    }

    private async getRecipients(activity: Activity): Promise<URL[]>{
        const json = activity.getJSONLD(this.url);
        const recipients = [];
        if (json.to) {
            recipients.push(new URL(json.to));
        }
        return recipients;
    }

    private async fetchForActor(uri: string, actor: Actor) {
        const request = new Request(uri, {
            headers: {
                Accept: 'application/ld+json'
            }
        });

        const signedRequest = await actor.sign(request, this.url);

        const result = await fetch(signedRequest);

        const json = await result.json();

        if (typeof json !== 'object' || json === null) {
            throw new Error('Could not read data');
        }

        return json;
    }
}
