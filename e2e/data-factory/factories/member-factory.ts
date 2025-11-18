import {Factory} from '@/data-factory';
import {faker} from '@faker-js/faker';
import {generateId, generateUuid} from '@/data-factory';

export interface Member {
    id: string;
    uuid: string;
    name: string | null;
    email: string;
    note: string | null;
    geolocation: string | null;
    labels: string[];
    email_count: number;
    email_opened_count: number;
    email_open_rate: number | null;
    status: 'free' | 'paid' | 'comped';
    last_seen_at: Date | null;
    last_commented_at: Date | null;
    newsletters: string[];
}

export class MemberFactory extends Factory<Partial<Member>, Member> {
    entityType = 'members';

    build(options: Partial<Member> = {}): Member {
        return {
            ...this.buildDefaultMember(),
            ...options
        };
    }

    private buildDefaultMember(): Member {
        const firstName = faker.person.firstName();
        const lastName = faker.person.lastName();
        const name = `${firstName} ${lastName}`;

        return {
            id: generateId(),
            uuid: generateUuid(),
            name: name,
            email: faker.internet.email({firstName, lastName}).toLowerCase(),
            note: faker.lorem.sentence(),
            geolocation: null,
            labels: [],
            email_count: 0,
            email_opened_count: 0,
            email_open_rate: null,
            status: 'free',
            last_seen_at: null,
            last_commented_at: null,
            newsletters: []
        };
    }
}
