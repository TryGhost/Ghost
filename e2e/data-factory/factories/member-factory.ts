import {Factory} from '@/data-factory';
import {faker} from '@faker-js/faker';
import {member} from '@tryghost/test-data';
import type {Member as CanonicalMember} from '@tryghost/test-data';

export interface Tier {
    id: string;
    name: string;
    slug: string;
    type: 'free' | 'paid';
    active: boolean;
}

/**
 * The *write/create* shape POSTed to /ghost/api/admin/members/ (`labels` are
 * plain names, `newsletters` are ids). The canonical *response* shape lives in
 * `@tryghost/test-data`; `build()` derives this payload from it.
 */
export interface Member {
    id: string;
    uuid: string;
    name: string | null;
    email: string;
    note?: string | null;
    geolocation: string | null;
    labels?: string[];
    email_count: number;
    email_opened_count: number;
    email_open_rate: number | null;
    status: 'free' | 'paid' | 'comped' | 'gift';
    last_seen_at: Date | null;
    last_commented_at: Date | null;
    newsletters: string[];
    tiers?: Partial<Tier>[];
    created_at?: string; // ISO 8601 format for backdating
    complimentary_plan?: boolean;
    stripe_customer_id?: string;
    subscribed_to_emails?: string;
}

/**
 * Derive the create payload from the canonical API response shape:
 * - labels flatten to names, newsletters flatten to ids
 * - response-only fields are dropped (transient_id, subscribed, tiers,
 *   subscriptions, created_at, updated_at) — the Admin API sets those itself
 * - subscribed_to_emails is a write-lane extra (shared with CSV import) that
 *   the response shape does not carry
 */
function toCreatePayload(canonical: CanonicalMember): Member {
    return {
        id: canonical.id,
        uuid: canonical.uuid,
        name: canonical.name,
        email: canonical.email,
        note: canonical.note,
        geolocation: canonical.geolocation,
        labels: canonical.labels.map(label => label.name),
        email_count: canonical.email_count,
        email_opened_count: canonical.email_opened_count,
        email_open_rate: canonical.email_open_rate,
        status: canonical.status,
        last_seen_at: canonical.last_seen_at ? new Date(canonical.last_seen_at) : null,
        last_commented_at: canonical.last_commented_at ? new Date(canonical.last_commented_at) : null,
        newsletters: canonical.newsletters.map(newsletter => newsletter.id),
        subscribed_to_emails: 'false'
    };
}

export class MemberFactory extends Factory<Partial<Member>, Member> {
    entityType = 'members';

    build(options: Partial<Member> = {}): Member {
        // The write lane seeds a note by default (specs type it into the
        // member form); the canonical response default is null.
        const canonical = member({note: faker.lorem.sentence()});
        return {
            ...toCreatePayload(canonical),
            ...options
        };
    }
}
