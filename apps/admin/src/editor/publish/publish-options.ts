/**
 * Pure publish-options logic for the React editor port.
 *
 * Ported from Ember's PublishOptions (ghost/admin/app/utils/publish-options.js).
 * The Ember class mixes data fetching, tracked state and save behaviour; here
 * the same logic is split into:
 *
 * - `PublishOptionsInput`: a plain snapshot of everything the Ember class read
 *   from services/models (post, settings, user, newsletters, member count)
 * - `PublishOptionsState`: the user's selections in the publish flow
 *   (publish type, schedule, newsletter, recipient filter)
 * - pure transition helpers and getters operating on (input, state)
 *
 * Data fetching lives in the React components; saving lives in use-editor.
 * This module must stay free of React/DOM/network dependencies.
 */

export type PublishType = "publish" | "publish+send" | "send";

export interface PublishOptionsPost {
    id: string;
    isPage: boolean;
    status: "draft" | "published" | "scheduled" | "sent";
    visibility: string;
    /** Tier slugs, used when visibility === 'tiers'. */
    tierSlugs: string[];
    /** Whether the post already has an email record (post.email). */
    hasEmail: boolean;
    /** Status of the existing email record, if any (e.g. 'failed'). */
    emailStatus: string | null;
    /** Slug of the newsletter the post was (or will be) sent with. */
    newsletterSlug: string | null;
    /** The post's saved email segment, if any. */
    emailSegment: string | null;
}

export interface PublishOptionsNewsletter {
    id: string;
    slug: string;
    name: string;
    status: string;
    sortOrder: number;
    /** Whether the newsletter is limited to paid members. */
    visibility?: string;
}

export interface PublishOptionsSettings {
    /** 'visibility' | 'disabled' | 'filter' */
    editorDefaultEmailRecipients: string;
    editorDefaultEmailRecipientsFilter: string | null;
    membersSignupAccess: string;
    defaultContentVisibility: string;
    mailgunIsConfigured: boolean;
}

export interface PublishOptionsUser {
    isAdmin: boolean;
    isContributor: boolean;
}

export interface PublishOptionsInput {
    post: PublishOptionsPost;
    settings: PublishOptionsSettings;
    user: PublishOptionsUser;
    newsletters: PublishOptionsNewsletter[];
    totalMemberCount: number;
    emailDisabledError?: string | null;
}

export interface PublishOptionsState {
    publishType: PublishType;
    isScheduled: boolean;
    scheduledAtUTC: Date;
    newsletterId: string | null;
    /** undefined = no explicit selection, fall back to defaults. */
    selectedRecipientFilter: string | null | undefined;
}

export interface PublishTypeOption {
    value: PublishType;
    label: string;
    display: string;
    disabled?: boolean;
}

/* Schedule times -------------------------------------------------------------*/

function withZeroMs(date: Date): Date {
    const next = new Date(date.getTime());
    next.setUTCMilliseconds(0);
    return next;
}

/** Earliest allowed schedule time: now + 5 seconds (ms truncated). */
export function minScheduledAt(now: Date = new Date()): Date {
    return withZeroMs(new Date(now.getTime() + 5 * 1000));
}

/** Default schedule time when toggling scheduling on: now + 10 minutes. */
export function defaultScheduledAt(now: Date = new Date()): Date {
    return withZeroMs(new Date(now.getTime() + 10 * 60 * 1000));
}

/* Getters --------------------------------------------------------------------*/

export function emailDisabledInSettings(settings: PublishOptionsSettings): boolean {
    return settings.editorDefaultEmailRecipients === "disabled"
        || settings.membersSignupAccess === "none";
}

/** Publish type dropdown is not shown at all. */
export function isEmailUnavailable(input: PublishOptionsInput): boolean {
    return input.post.isPage
        || input.post.hasEmail
        || emailDisabledInSettings(input.settings);
}

/** Publish type dropdown is shown but email options are disabled. */
export function isEmailDisabled(input: PublishOptionsInput): boolean {
    return !input.settings.mailgunIsConfigured
        || input.totalMemberCount === 0
        || Boolean(input.emailDisabledError);
}

export function getPublishTypeOptions(input: PublishOptionsInput): PublishTypeOption[] {
    const disabled = isEmailDisabled(input);
    return [
        { value: "publish+send", label: "Publish and email", display: "Publish and email", disabled },
        { value: "publish", label: "Publish only", display: "Publish" },
        { value: "send", label: "Email only", display: "Email", disabled },
    ];
}

export function getSelectedPublishTypeOption(
    input: PublishOptionsInput,
    state: PublishOptionsState,
): PublishTypeOption {
    const options = getPublishTypeOptions(input);
    return options.find(option => option.value === state.publishType) ?? options[0];
}

export function getActiveNewsletters(input: PublishOptionsInput): PublishOptionsNewsletter[] {
    return input.newsletters
        .filter(newsletter => newsletter.status === "active")
        .sort((a, b) => a.sortOrder - b.sortOrder);
}

export function getSelectedNewsletter(
    input: PublishOptionsInput,
    state: PublishOptionsState,
): PublishOptionsNewsletter | null {
    const newsletters = getActiveNewsletters(input);
    return newsletters.find(newsletter => newsletter.id === state.newsletterId)
        ?? newsletters[0]
        ?? null;
}

export function onlyDefaultNewsletter(input: PublishOptionsInput): boolean {
    return getActiveNewsletters(input).length === 1;
}

/** Ember post.visibilitySegment. */
export function getVisibilitySegment(
    post: PublishOptionsPost,
    settings: PublishOptionsSettings,
): string {
    if (post.visibility === "public") {
        return settings.defaultContentVisibility === "paid" ? "status:-free" : "status:free,status:-free";
    }
    if (post.visibility === "members") {
        return "status:free,status:-free";
    }
    if (post.visibility === "paid") {
        return "status:-free";
    }
    if (post.visibility === "tiers") {
        return post.tierSlugs.map(slug => `tier:${slug}`).join(",");
    }
    return post.visibility;
}

export function getDefaultRecipientFilter(input: PublishOptionsInput): string | null {
    const recipients = input.settings.editorDefaultEmailRecipients;
    const filter = input.settings.editorDefaultEmailRecipientsFilter;

    const usuallyNobody = recipients === "filter" && filter === null;

    if (recipients === "disabled") {
        return null;
    }

    if (recipients === "visibility" || usuallyNobody) {
        const { visibility } = input.post;
        if (visibility === "public" || visibility === "members") {
            return "status:free,status:-free";
        }
        if (visibility === "paid") {
            return "status:-free";
        }
        if (visibility === "tiers") {
            return getVisibilitySegment(input.post, input.settings);
        }
        return visibility;
    }

    return filter;
}

export function getRecipientFilter(
    input: PublishOptionsInput,
    state: PublishOptionsState,
): string | null {
    if (state.selectedRecipientFilter === undefined) {
        return (input.post.newsletterSlug && input.post.emailSegment) || getDefaultRecipientFilter(input);
    }
    return state.selectedRecipientFilter;
}

/** Member-count filter combining the newsletter audience with the recipient segment. */
export function getFullRecipientFilter(
    input: PublishOptionsInput,
    state: PublishOptionsState,
): string | null {
    const newsletter = getSelectedNewsletter(input, state);
    if (!newsletter) {
        return null;
    }

    // Ember newsletter.recipientFilter
    const parts = [`newsletters.slug:${newsletter.slug}`, "email_disabled:0"];
    if (newsletter.visibility === "paid") {
        parts.push("status:-free");
    }
    let filter = parts.join("+");

    const recipientFilter = getRecipientFilter(input, state);
    if (recipientFilter) {
        filter += `+(${recipientFilter})`;
    }

    return filter;
}

/* Recipient filter parsing/building (Ember gh-members-recipient-select) ------*/

/** The free/paid toggles; everything else in a filter is a "specific" segment. */
export const BASE_RECIPIENT_FILTERS = ["status:free", "status:-free"] as const;

export type BaseRecipientFilter = (typeof BASE_RECIPIENT_FILTERS)[number];

function splitFilter(filter: string | null): string[] {
    return (filter ?? "")
        .split(",")
        .map(item => item.trim())
        .filter(item => item !== "");
}

/** The base (free/paid) parts of a recipient filter, in appearance order. */
export function getBaseRecipientFilters(filter: string | null): string[] {
    return splitFilter(filter).filter(item => (BASE_RECIPIENT_FILTERS as readonly string[]).includes(item));
}

/** The specific-segment parts (label:..., tier:...) of a recipient filter. */
export function getSpecificRecipientFilters(filter: string | null): string[] {
    return splitFilter(filter).filter(item => !(BASE_RECIPIENT_FILTERS as readonly string[]).includes(item));
}

/**
 * Join base + specific selections back into a filter string (Ember
 * GhMembersRecipientSelect.updateFilter): paid is dropped when Stripe isn't
 * enabled, an empty selection becomes null ("not sent as newsletter").
 */
export function buildRecipientFilter(
    base: Iterable<string>,
    specific: Iterable<string>,
    paidAvailable: boolean,
): string | null {
    const selected = new Set([...base, ...specific]);
    if (!paidAvailable) {
        selected.delete("status:-free");
    }
    return Array.from(selected).join(",") || null;
}

/** Toggle a free/paid base filter on/off (Ember toggleFilter). */
export function toggleBaseRecipientFilter(
    filter: string | null,
    baseFilter: BaseRecipientFilter,
    paidAvailable: boolean,
): string | null {
    const base = new Set(getBaseRecipientFilters(filter));
    if (base.has(baseFilter)) {
        base.delete(baseFilter);
    } else {
        base.add(baseFilter);
    }
    return buildRecipientFilter(base, getSpecificRecipientFilters(filter), paidAvailable);
}

/** Replace the specific-segment selection, keeping the base toggles (Ember selectSpecificOptions). */
export function setSpecificRecipientFilters(
    filter: string | null,
    segments: Iterable<string>,
    paidAvailable: boolean,
): string | null {
    return buildRecipientFilter(getBaseRecipientFilters(filter), segments, paidAvailable);
}

export type RecipientType = "none" | "free" | "paid" | "all" | "specific";

export function getRecipientType(filter: string | null): RecipientType {
    if (!filter) {
        return "none";
    }
    if (filter === "status:free") {
        return "free";
    }
    if (filter === "status:-free") {
        return "paid";
    }
    if (filter.includes("status:free") && filter.includes("status:-free")) {
        return "all";
    }
    return "specific";
}

export function willEmail(input: PublishOptionsInput, state: PublishOptionsState): boolean {
    const { post } = input;
    return (
        (state.publishType !== "publish"
            && Boolean(getRecipientFilter(input, state))
            && post.status === "draft"
            && !post.hasEmail)
        || (post.status === "draft" && post.hasEmail && post.emailStatus === "failed")
    );
}

export function willPublish(state: PublishOptionsState): boolean {
    return state.publishType !== "send";
}

export function willOnlyEmail(state: PublishOptionsState): boolean {
    return state.publishType === "send";
}

/* Construction & transitions --------------------------------------------------*/

/**
 * Port of Ember's setupTask defaults: start from 'publish+send' then fall
 * back to 'publish' when email is unavailable/disabled or default recipients
 * are "Usually nobody", and to 'send' for sent posts.
 */
export function createPublishOptions(
    input: PublishOptionsInput,
    now: Date = new Date(),
): PublishOptionsState {
    let publishType: PublishType = "publish+send";

    if (isEmailUnavailable(input) || isEmailDisabled(input)) {
        publishType = "publish";
    }

    if (
        input.settings.editorDefaultEmailRecipients === "filter"
        && input.settings.editorDefaultEmailRecipientsFilter === null
    ) {
        publishType = "publish";
    }

    if (input.post.status === "sent") {
        publishType = "send";
    }

    return {
        publishType,
        isScheduled: false,
        scheduledAtUTC: minScheduledAt(now),
        newsletterId: getActiveNewsletters(input)[0]?.id ?? null,
        selectedRecipientFilter: undefined,
    };
}

export function setPublishType(state: PublishOptionsState, publishType: PublishType): PublishOptionsState {
    return { ...state, publishType };
}

export function setNewsletter(state: PublishOptionsState, newsletterId: string): PublishOptionsState {
    return { ...state, newsletterId };
}

export function setRecipientFilter(state: PublishOptionsState, filter: string | null): PublishOptionsState {
    return { ...state, selectedRecipientFilter: filter };
}

export function toggleScheduled(
    state: PublishOptionsState,
    shouldSchedule: boolean,
    now: Date = new Date(),
): PublishOptionsState {
    const next = { ...state, isScheduled: shouldSchedule };

    if (shouldSchedule && (!next.scheduledAtUTC || next.scheduledAtUTC < defaultScheduledAt(now))) {
        next.scheduledAtUTC = defaultScheduledAt(now);
    }

    return next;
}

export function setScheduledAt(
    state: PublishOptionsState,
    date: Date,
    now: Date = new Date(),
): PublishOptionsState {
    // API only stores seconds, so keep milliseconds at 0 (Ember setScheduledAt)
    const next = withZeroMs(date);
    const min = minScheduledAt(now);

    return { ...state, scheduledAtUTC: next < min ? min : next };
}

export function resetPastScheduledAt(
    state: PublishOptionsState,
    now: Date = new Date(),
): PublishOptionsState {
    if (state.scheduledAtUTC < minScheduledAt(now)) {
        return { ...state, isScheduled: false };
    }
    return state;
}

/* Save details -----------------------------------------------------------------*/

export interface PublishSaveDetails {
    saveType: "publish" | "schedule";
    /** ISO timestamp, set only when scheduling. */
    publishedAt?: string;
    /** Set only when emailing (Ember only touches emailOnly when willEmail). */
    emailOnly?: boolean;
    /** Newsletter slug query param, set only when emailing. */
    newsletter?: string;
    /** Recipient filter query param, set only when emailing. */
    emailSegment?: string;
}

/**
 * What the editor save needs to do for the selected publish options. Mirrors
 * Ember's PublishOptions._applyModelChanges + saveTask adapterOptions.
 */
export function getPublishSaveDetails(
    input: PublishOptionsInput,
    state: PublishOptionsState,
): PublishSaveDetails {
    const emailing = willEmail(input, state);

    const details: PublishSaveDetails = {
        saveType: state.isScheduled ? "schedule" : "publish",
    };

    if (state.isScheduled) {
        details.publishedAt = state.scheduledAtUTC.toISOString();
    }

    if (emailing) {
        details.emailOnly = state.publishType === "send";
        details.newsletter = getSelectedNewsletter(input, state)?.slug;
        details.emailSegment = getRecipientFilter(input, state) ?? undefined;
    }

    return details;
}

/* Validation ---------------------------------------------------------------------*/

/**
 * Minimal port of the post validations Ember runs before opening the publish
 * flow (title and excerpt length are the ones that can fail from the editor
 * screen — ghost/admin/app/validators/post.js). Returns an error message or
 * null when valid.
 */
export function validatePost({ title, customExcerpt }: { title: string; customExcerpt?: string | null }): string | null {
    if (title.length > 255) {
        return "Validation failed: Title cannot be longer than 255 characters.";
    }
    if ((customExcerpt ?? "").length > 300) {
        return "Validation failed: Excerpt cannot be longer than 300 characters.";
    }
    return null;
}
