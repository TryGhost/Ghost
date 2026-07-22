import { checkStripeEnabled, getSettingValues, useBrowseSettings } from "@tryghost/admin-x-framework/api/settings";
import { useBrowseConfig } from "@tryghost/admin-x-framework/api/config";

import { useFeatureFlag } from "@/hooks/use-feature-flag";

/**
 * Navigation model for the native Shade settings shell. Mirrors the legacy
 * sidebar (apps/admin-x-settings/src/components/sidebar.tsx): same groups,
 * same items, same conditional visibility, and the same search keywords —
 * copied verbatim from the legacy area files so search behaves identically.
 * As areas are rebuilt natively, their keywords move here for good.
 */

export type SettingsAreaId = "general" | "site" | "membership" | "email" | "growth" | "advanced";

export interface SettingsNavItem {
    /**
     * Legacy route segments this item answers to; the first entry is the
     * canonical segment used when navigating (kept identical to the legacy
     * app so deep links survive the flag flip).
     */
    navids: string[];
    title: string;
    keywords: string[];
    /** The settings area (main scroll section) this item belongs to. */
    area: SettingsAreaId;
    /** Access shows a "Private" badge when private site mode is on. */
    showPrivateBadge?: boolean;
}

export interface SettingsNavGroup {
    title: string;
    items: SettingsNavItem[];
}

export interface SettingsAreaSection {
    id: SettingsAreaId;
    title: string;
    /** Keywords of the area's visible items, for hide-on-search. */
    keywords: string[];
}

export interface SettingsNavData {
    /** Sidebar groups, in render order. */
    groups: SettingsNavGroup[];
    /** Main-content area sections, in render order. */
    areas: SettingsAreaSection[];
    isLoading: boolean;
}

// Keywords below are copied from the legacy `searchKeywords` exports in
// apps/admin-x-settings/src/components/settings/*/*-settings.tsx.
export const generalKeywords = {
    titleAndDescription: ["general", "title and description", "site title", "site description", "title & description"],
    timeZone: ["general", "time", "date", "site timezone", "time zone"],
    publicationLanguage: ["general", "publication language", "locale"],
    users: ["general", "users and permissions", "roles", "staff", "invite people", "contributors", "editors", "authors", "administrators"],
    metadata: ["general", "metadata", "title", "description", "search", "engine", "google", "meta data", "twitter card", "structured data", "rich cards", "x card", "social", "facebook card", "llms", "ai", "ai search engines", "llm"],
    socialAccounts: ["general", "social accounts", "facebook", "twitter", "threads", "bluesky", "mastodon", "tiktok", "youtube", "instagram", "linkedin", "structured data", "rich cards"],
    analytics: ["general", "analytics", "tracking", "privacy", "membership"],
};

export const siteKeywords = {
    design: ["site", "logo", "cover", "colors", "fonts", "background", "themes", "appearance", "style", "design & branding", "design and branding"],
    theme: ["theme", "template", "upload"],
    navigation: ["site", "navigation", "menus", "primary", "secondary", "links"],
    announcementBar: ["site", "announcement bar", "important", "banner"],
};

export const membershipKeywords = {
    access: ["membership", "default", "access", "subscription", "post", "membership", "comments", "commenting", "signup", "sign up", "spam", "filters", "prevention", "prevent", "block", "domains", "email", "password protection", "lock site", "private site", "private site mode", "make this site private"],
    tiers: ["membership", "tiers", "payment", "paid", "stripe"],
    portal: ["membership", "portal", "signup", "sign up", "signin", "sign in", "login", "account", "membership", "support", "email", "address", "support email address", "support address"],
    giftSubscriptions: ["membership", "gift", "gifts", "gift subscriptions", "present", "share", "shareable link"],
    memberEmails: ["membership", "signup", "welcome email", "welcome emails", "email", "new user", "new member", "account"],
    tips: ["membership", "tips", "donations", "one time", "payment"],
    customFields: ["membership", "custom fields", "fields", "member fields", "custom field"],
};

// email/email-settings.tsx (automations flag off)
const emailKeywords = {
    enableNewsletters: ["emails", "newsletters", "newsletter sending", "enable", "disable", "turn on", "turn off"],
    newsletters: ["newsletters", "emails", "design", "customization"],
    defaultRecipients: ["newsletters", "default recipients", "emails"],
    mailgun: ["mailgun", "emails", "newsletters"],
};

// email/emails.tsx (automations flag on)
const emailsKeywords = {
    enableNewsletters: ["emails", "newsletters", "newsletter sending", "enable", "disable", "turn on", "turn off"],
    emails: ["emails", "newsletters", "automation emails", "transactional", "design", "customization", "automations", "welcome"],
    defaultRecipients: ["newsletters", "default recipients", "emails"],
    mailgun: ["mailgun", "emails", "newsletters"],
};

const growthKeywords = {
    network: ["growth", "network", "activitypub", "blog", "fediverse", "sharing"],
    explore: ["ghost explore", "explore", "growth", "share", "list", "listing"],
    recommendations: ["growth", "recommendations", "recommend", "blogroll"],
    embedSignupForm: ["growth", "embeddable signup form", "embeddable form", "embeddable sign up form", "embeddable sign up"],
    offers: ["growth", "offers", "discounts", "coupons", "promotions"],
};

const advancedKeywords = {
    integrations: ["advanced", "integrations", "zapier", "slack", "unsplash", "first promoter", "firstpromoter", "pintura", "disqus", "analytics", "ulysses", "typeform", "buffer", "plausible", "github", "webhooks"],
    migrationtools: ["import", "export", "migrate", "substack", "substack", "migration", "medium", "wordpress", "wp", "squarespace", "beehiiv"],
    codeInjection: ["advanced", "code injection", "head", "footer"],
    labs: ["advanced", "labs", "alpha", "private", "beta", "flag", "routes", "redirect", "translation", "editor", "portal"],
    history: ["advanced", "history", "log", "events", "user events", "staff", "audit", "action"],
    dangerzone: ["danger zone", "delete all content", "delete site", "reset all authentication", "reset api keys", "reset password", "compromised credentials", "lock staff users", "sign out all staff"],
};

/**
 * Legacy hash routes per area, shown in the placeholder fallback notes while
 * an area hasn't been rebuilt natively yet.
 */
export const LEGACY_AREA_ROUTES: Record<SettingsAreaId, string> = {
    general: "#/settings/general",
    site: "#/settings/design",
    membership: "#/settings/members",
    email: "#/settings/enable-newsletters",
    growth: "#/settings/recommendations",
    advanced: "#/settings/integrations",
};

export function useSettingsNav(): SettingsNavData {
    const { data: settingsData, isLoading: settingsLoading } = useBrowseSettings();
    const { data: configData, isLoading: configLoading } = useBrowseConfig();
    const hasAutomations = useFeatureFlag("automations");
    const hasCustomFields = useFeatureFlag("membersCustomFields");

    const settings = settingsData?.settings ?? [];
    const config = configData?.config;
    const [hasTipsAndDonations, isPrivate, paidMembersEnabled, newslettersEnabled] = getSettingValues(settings, [
        "donations_enabled",
        "is_private",
        "paid_members_enabled",
        "editor_default_email_recipients",
    ]) as [boolean, boolean, boolean, string];
    const hasStripeEnabled = config ? checkStripeEnabled(settings, config) : false;
    const hasNewslettersEnabled = newslettersEnabled !== "disabled";
    const mailgunIsConfigured = Boolean(config?.mailgunIsConfigured);
    const hasMailgun = hasNewslettersEnabled && !mailgunIsConfigured;

    const emailItemKeywords = hasAutomations
        ? [
            emailsKeywords.enableNewsletters,
            ...(hasNewslettersEnabled ? [emailsKeywords.defaultRecipients] : []),
            emailsKeywords.emails,
            ...(hasMailgun ? [emailsKeywords.mailgun] : []),
        ].flat()
        : [
            emailKeywords.enableNewsletters,
            ...(hasNewslettersEnabled ? [emailKeywords.defaultRecipients, emailKeywords.newsletters] : []),
            ...(hasMailgun ? [emailKeywords.mailgun] : []),
        ].flat();

    const emailItem: SettingsNavItem = hasAutomations
        ? { navids: ["enable-newsletters", "default-recipients", "emails", "mailgun"], title: "Email", keywords: emailItemKeywords, area: "email" }
        : { navids: ["enable-newsletters", "default-recipients", "newsletters", "mailgun"], title: "Newsletters", keywords: emailItemKeywords, area: "email" };

    const membershipItems: SettingsNavItem[] = [
        { navids: ["members", "spam-filters"], title: "Access", keywords: membershipKeywords.access, area: "membership", showPrivateBadge: Boolean(isPrivate) },
        { navids: ["tiers"], title: "Tiers", keywords: membershipKeywords.tiers, area: "membership" },
        { navids: ["portal"], title: "Signup portal", keywords: membershipKeywords.portal, area: "membership" },
        ...(paidMembersEnabled ? [{ navids: ["gift-subscriptions"], title: "Gift subscriptions", keywords: membershipKeywords.giftSubscriptions, area: "membership" as const }] : []),
        ...(!hasAutomations ? [{ navids: ["memberemails"], title: "Welcome emails", keywords: membershipKeywords.memberEmails, area: "membership" as const }] : []),
        ...(hasTipsAndDonations && hasStripeEnabled ? [{ navids: ["tips-and-donations"], title: "Tips & donations", keywords: membershipKeywords.tips, area: "membership" as const }] : []),
        ...(hasCustomFields ? [{ navids: ["custom-fields"], title: "Custom fields", keywords: membershipKeywords.customFields, area: "membership" as const }] : []),
    ];

    const groups: SettingsNavGroup[] = [
        {
            title: "General settings",
            items: [
                { navids: ["general"], title: "Title & description", keywords: generalKeywords.titleAndDescription, area: "general" },
                { navids: ["timezone"], title: "Timezone", keywords: generalKeywords.timeZone, area: "general" },
                { navids: ["publication-language"], title: "Publication language", keywords: generalKeywords.publicationLanguage, area: "general" },
                { navids: ["staff"], title: "Staff", keywords: generalKeywords.users, area: "general" },
                { navids: ["metadata"], title: "Meta data", keywords: generalKeywords.metadata, area: "general" },
                { navids: ["social-accounts"], title: "Social accounts", keywords: generalKeywords.socialAccounts, area: "general" },
                { navids: ["analytics"], title: "Analytics", keywords: generalKeywords.analytics, area: "general" },
            ],
        },
        {
            title: "Site",
            items: [
                { navids: ["design"], title: "Design & branding", keywords: siteKeywords.design, area: "site" },
                { navids: ["theme"], title: "Theme", keywords: siteKeywords.theme, area: "site" },
                { navids: ["navigation"], title: "Navigation", keywords: siteKeywords.navigation, area: "site" },
                { navids: ["announcement-bar"], title: "Announcement bar", keywords: siteKeywords.announcementBar, area: "site" },
            ],
        },
        {
            title: "Membership",
            items: [...membershipItems, emailItem],
        },
        {
            title: "Growth",
            items: [
                { navids: ["network"], title: "Network", keywords: growthKeywords.network, area: "growth" },
                { navids: ["explore"], title: "Ghost Explore", keywords: growthKeywords.explore, area: "growth" },
                { navids: ["recommendations"], title: "Recommendations", keywords: growthKeywords.recommendations, area: "growth" },
                { navids: ["embed-signup-form"], title: "Signup forms", keywords: growthKeywords.embedSignupForm, area: "growth" },
                ...(hasStripeEnabled ? [{ navids: ["offers"], title: "Offers", keywords: growthKeywords.offers, area: "growth" as const }] : []),
            ],
        },
        {
            title: "Advanced",
            items: [
                { navids: ["integrations"], title: "Integrations", keywords: advancedKeywords.integrations, area: "advanced" },
                { navids: ["migration"], title: "Import/Export", keywords: advancedKeywords.migrationtools, area: "advanced" },
                { navids: ["code-injection"], title: "Code injection", keywords: advancedKeywords.codeInjection, area: "advanced" },
                { navids: ["labs"], title: "Labs", keywords: advancedKeywords.labs, area: "advanced" },
                { navids: ["history"], title: "History", keywords: advancedKeywords.history, area: "advanced" },
                { navids: ["dangerzone"], title: "Danger zone", keywords: advancedKeywords.dangerzone, area: "advanced" },
            ],
        },
    ];

    const items = groups.flatMap((group) => group.items);
    const areaKeywords = (area: SettingsAreaId): string[] =>
        items.filter((item) => item.area === area).flatMap((item) => item.keywords);

    const areas: SettingsAreaSection[] = [
        { id: "general", title: "General settings", keywords: areaKeywords("general") },
        { id: "site", title: "Site", keywords: areaKeywords("site") },
        { id: "membership", title: "Membership", keywords: areaKeywords("membership") },
        { id: "email", title: hasAutomations ? "Email" : "Newsletters", keywords: areaKeywords("email") },
        { id: "growth", title: "Growth", keywords: areaKeywords("growth") },
        { id: "advanced", title: "Advanced", keywords: areaKeywords("advanced") },
    ];

    return { groups, areas, isLoading: settingsLoading || configLoading };
}

const AREA_IDS: SettingsAreaId[] = ["general", "site", "membership", "email", "growth", "advanced"];

// Static navid → area map covering every legacy nav route regardless of
// conditional item visibility, so deep links resolve before settings/config
// have loaded (and never bounce to the index during boot).
const NAVID_AREAS: Record<string, SettingsAreaId> = {
    general: "general",
    timezone: "general",
    "publication-language": "general",
    staff: "general",
    metadata: "general",
    "social-accounts": "general",
    analytics: "general",
    design: "site",
    theme: "site",
    navigation: "site",
    "announcement-bar": "site",
    members: "membership",
    "spam-filters": "membership",
    tiers: "membership",
    portal: "membership",
    "gift-subscriptions": "membership",
    memberemails: "membership",
    "tips-and-donations": "membership",
    "custom-fields": "membership",
    "enable-newsletters": "email",
    "default-recipients": "email",
    emails: "email",
    newsletters: "email",
    mailgun: "email",
    network: "growth",
    explore: "growth",
    recommendations: "growth",
    "embed-signup-form": "growth",
    offers: "growth",
    integrations: "advanced",
    migration: "advanced",
    "code-injection": "advanced",
    labs: "advanced",
    history: "advanced",
    dangerzone: "advanced",
};

/**
 * Maps a `/settings/:area` segment to the area section it lives in — the
 * segment can be an area id or any legacy nav route (e.g. `design` → site).
 * Returns undefined for routes the shell doesn't know (the caller redirects
 * to the settings index).
 */
export function resolveSettingsArea(segment: string): SettingsAreaId | undefined {
    if ((AREA_IDS as string[]).includes(segment)) {
        return segment as SettingsAreaId;
    }
    return NAVID_AREAS[segment];
}
