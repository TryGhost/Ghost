import {faker} from "@faker-js/faker";
import {createBuilder} from "../factory";
import {generateId, generateUuid} from "../utils";
import type {Label} from "./label";

/**
 * Ghost Admin API member resource — the API *response* shape (labels are full
 * Label entities, ISO-string dates). Write-lane consumers derive their create
 * payload from this builder: e2e's MemberFactory flattens labels/newsletters
 * to names/ids and drops response-only fields before POSTing.
 */
export interface MemberTier {
    id: string;
    name: string;
    slug: string;
    active: boolean;
    type: "free" | "paid";
}

export interface MemberNewsletter {
    id: string;
    uuid: string;
    name: string;
    slug: string;
    status: string;
}

export interface Member {
    id: string;
    transient_id: string;
    uuid: string;
    name: string | null;
    email: string;
    avatar_image?: string;
    status: "free" | "paid" | "comped" | "gift";
    note: string | null;
    subscribed: boolean;
    labels: Label[];
    tiers: MemberTier[];
    newsletters: MemberNewsletter[];
    subscriptions: unknown[];
    email_count: number;
    email_opened_count: number;
    email_open_rate: number | null;
    geolocation: string | null;
    last_seen_at: string | null;
    last_commented_at: string | null;
    created_at: string;
    updated_at: string;
}

export const member = createBuilder<Member>(() => {
    const now = new Date().toISOString();
    const firstName = faker.person.firstName();
    const lastName = faker.person.lastName();

    return {
        id: generateId(),
        transient_id: generateUuid(),
        uuid: generateUuid(),
        name: `${firstName} ${lastName}`,
        email: faker.internet.email({firstName, lastName}).toLowerCase(),
        status: "free",
        note: null,
        subscribed: false,
        labels: [],
        tiers: [],
        newsletters: [],
        subscriptions: [],
        email_count: 0,
        email_opened_count: 0,
        email_open_rate: null,
        geolocation: null,
        last_seen_at: null,
        last_commented_at: null,
        created_at: now,
        updated_at: now
    };
});
