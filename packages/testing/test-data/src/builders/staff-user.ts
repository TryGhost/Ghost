import {faker} from "@faker-js/faker";
import {createBuilder} from "../factory";
import {generateId, generateSlug} from "../utils";

export type StaffRoleName = "Owner" | "Administrator" | "Editor" | "Super Editor" | "Author" | "Contributor";

export interface StaffRole {
    id: string;
    name: StaffRoleName;
    description: string;
    created_at: string;
    updated_at: string;
}

export interface StaffUser {
    id: string;
    name: string;
    slug: string;
    email: string;
    profile_image: string | null;
    cover_image: string | null;
    bio: string | null;
    website: string | null;
    location: string | null;
    facebook: string | null;
    twitter: string | null;
    accessibility: string | null;
    status: "active" | "inactive";
    meta_title: string | null;
    meta_description: string | null;
    tour: string | null;
    last_seen: string;
    comment_notifications: boolean;
    free_member_signup_notification: boolean;
    paid_subscription_started_notification: boolean;
    paid_subscription_canceled_notification: boolean;
    mention_notifications: boolean;
    recommendation_notifications: boolean;
    milestone_notifications: boolean;
    donation_notifications: boolean;
    gift_subscription_notifications: boolean;
    created_at: string;
    updated_at: string;
    url: string;
    roles: StaffRole[];
    threads: string | null;
    bluesky: string | null;
    linkedin: string | null;
    instagram: string | null;
    youtube: string | null;
    tiktok: string | null;
    mastodon: string | null;
}

export interface StaffInvite {
    id: string;
    role_id: string;
    status: "sent";
    email: string;
    expires: number;
    created_at: string;
    updated_at: string;
}

export const staffRole = createBuilder<StaffRole>(() => {
    const now = new Date().toISOString();
    return {
        id: generateId(),
        name: "Author",
        description: "Authors",
        created_at: now,
        updated_at: now
    };
});

export const staffUser = createBuilder<StaffUser>(() => {
    const now = new Date().toISOString();
    const name = faker.person.fullName();
    const slug = generateSlug(name);
    return {
        id: generateId(),
        name,
        slug,
        email: faker.internet.email().toLowerCase(),
        profile_image: null,
        cover_image: null,
        bio: null,
        website: null,
        location: null,
        facebook: null,
        twitter: null,
        accessibility: null,
        status: "active",
        meta_title: null,
        meta_description: null,
        tour: null,
        last_seen: now,
        comment_notifications: true,
        free_member_signup_notification: true,
        paid_subscription_started_notification: true,
        paid_subscription_canceled_notification: false,
        mention_notifications: true,
        recommendation_notifications: true,
        milestone_notifications: true,
        donation_notifications: true,
        gift_subscription_notifications: true,
        created_at: now,
        updated_at: now,
        url: `http://localhost:2368/author/${slug}/`,
        roles: [staffRole()],
        threads: null,
        bluesky: null,
        linkedin: null,
        instagram: null,
        youtube: null,
        tiktok: null,
        mastodon: null
    };
});

export const staffInvite = createBuilder<StaffInvite>(() => {
    const now = new Date().toISOString();
    return {
        id: generateId(),
        role_id: staffRole().id,
        status: "sent",
        email: faker.internet.email().toLowerCase(),
        expires: Date.now() + 24 * 60 * 60 * 1000,
        created_at: now,
        updated_at: now
    };
});
