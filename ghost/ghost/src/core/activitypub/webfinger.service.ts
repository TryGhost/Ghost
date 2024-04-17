import {Inject} from '@nestjs/common';
import {ActorRepository} from './actor.repository';

const accountResource = /acct:(\w+)@(\w+)/;
export class WebFingerService {
    constructor(
        @Inject('ActorRepository') private repository: ActorRepository,
        @Inject('ActivityPubBaseURL') private url: URL
    ) {}

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    async getResource(resource: string, rel?: string[]) {
        const match = resource.match(accountResource);
        if (!match) {
            throw new Error('Invalid Resource');
        }

        const username = match[1];

        const actor = await this.repository.getOne(username);

        if (!actor) {
            throw new Error('not found');
        }

        const result = {
            subject: resource,
            links: [
                {
                    rel: 'self',
                    type: 'application/activity+json',
                    href: actor.getJSONLD(this.url).id
                }
            ]
        };

        return result;
    }
}
