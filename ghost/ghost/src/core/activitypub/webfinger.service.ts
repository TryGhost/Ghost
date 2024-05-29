import {Inject} from '@nestjs/common';
import {ActorRepository} from './actor.repository';

const accountResourceMatcher = /acct:(\w+)@(\w+)/;
const usernameMatcher = /@?(.+)@(.+)/;
export class WebFingerService {
    constructor(
        @Inject('ActorRepository') private repository: ActorRepository,
        @Inject('ActivityPubBaseURL') private url: URL
    ) {}

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    async getResource(resource: string, rel?: string[]) {
        const match = resource.match(accountResourceMatcher);
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

    async finger(handle: string) {
        const match = handle.match(usernameMatcher);

        if (!match) {
            throw new Error('Invalid username');
        }

        const username = match[1];
        const host = match[2];

        let protocol = 'https';

        // TODO Never in prod
        if (host.startsWith('localhost') || host.startsWith('127.0.0.1')) {
            protocol = 'http';
        }

        const res = await fetch(`${protocol}://${host}/.well-known/webfinger?resource=acct:${username}@${host}`);

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const json: any = await res.json();

        if (json.subject !== `acct:${username}@${host}`) {
            throw new Error('Subject does not match - not jumping thru hoops');
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const self = json.links.find((link: any) => link.rel === 'self');

        const selfRes = await fetch(self.href, {
            headers: {
                accept: self.type
            }
        });

        const data = await selfRes.json();

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return data as any;
    }
}
