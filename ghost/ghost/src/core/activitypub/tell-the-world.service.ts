import {Inject} from '@nestjs/common';
import {Activity} from './activity.entity';
import {Actor} from './actor.entity';

export class TheWorld {
    constructor(
        @Inject('ActivityPubBaseURL') private readonly url: URL,
        @Inject('logger') private readonly logger: Console
    ) {}

    async deliverActivity(activity: Activity, actor: Actor): Promise<void> {
        const recipients = await this.getRecipients(activity);
        for (const recipient of recipients) {
            const data = await this.fetchForActor(recipient.href, actor);
            if ('inbox' in data && typeof data.inbox === 'string') {
                const inbox = new URL(data.inbox);
                await this.sendActivity(inbox, activity, actor);
            }

            if ('type' in data && data.type === 'Collection') {
                if ('items' in data && Array.isArray(data.items)) {
                    for (const item of data.items) {
                        let url;
                        if (typeof item === 'string') {
                            url = new URL(item);
                        } else if ('id' in item && typeof item.id === 'string') {
                            url = new URL(item.id);
                        }
                        if (url) {
                            const fetchedActor = await this.fetchForActor(url.href, actor);
                            if ('inbox' in fetchedActor && typeof fetchedActor.inbox === 'string') {
                                const inbox = new URL(fetchedActor.inbox);
                                await this.sendActivity(inbox, activity, actor);
                            }
                        }
                    }
                }
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
        try {
            await fetch(signedRequest);
        } catch (err) {
            this.logger.error(err);
        }
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
