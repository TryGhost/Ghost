import { useBrowseConfig } from "@tryghost/admin-x-framework/api/config";
import { useCurrentUser } from "@tryghost/admin-x-framework/api/current-user";
import { type EditorResource, type FullPost } from "@tryghost/admin-x-framework/api/editor";
import { useBrowseLabels } from "@tryghost/admin-x-framework/api/labels";
import { useBrowseMembers } from "@tryghost/admin-x-framework/api/members";
import { useBrowseNewsletters } from "@tryghost/admin-x-framework/api/newsletters";
import { checkStripeEnabled, getSettingValue, useBrowseSettings } from "@tryghost/admin-x-framework/api/settings";
import { useBrowseTiers } from "@tryghost/admin-x-framework/api/tiers";
import { isAdminUser, isContributorUser, isOwnerUser } from "@tryghost/admin-x-framework/api/users";
import { type PublishOptionsInput } from "./publish-options";

/** Site timezone setting, 'Etc/UTC' until settings load. */
export function useSiteTimezone(): string {
    const { data } = useBrowseSettings();
    return getSettingValue<string>(data?.settings, "timezone") ?? "Etc/UTC";
}

export interface RecipientSegmentOption {
    name: string;
    segment: string;
}

export interface RecipientSegmentGroup {
    name: string;
    options: RecipientSegmentOption[];
}

export interface RecipientSelectData {
    /** Paid toggle availability (Ember membersUtils.isStripeEnabled). */
    stripeEnabled: boolean;
    /** "Specific people" option groups: labels + tiers (Ember gh-members-recipient-select). */
    segmentGroups: RecipientSegmentGroup[];
}

/**
 * Data for the publish flow's recipients selector, mirroring what Ember's
 * GhMembersRecipientSelect/GhSegmentTokenInput fetch: the label list and the
 * paid tiers (tier options only appear when there's more than one paid tier,
 * since a single tier is equivalent to the Paid toggle).
 *
 * Deviation from Ember: labels are fetched in one `limit=all` request instead
 * of the labelsManager's infinite scroll + server-side search.
 */
export function useRecipientSelectData(enabled: boolean): RecipientSelectData {
    const { data: settingsData } = useBrowseSettings();
    const { data: configData } = useBrowseConfig();
    const { data: labelsData } = useBrowseLabels({
        searchParams: { limit: "all" },
        enabled,
        defaultErrorHandler: false,
    });
    const { data: tiersData } = useBrowseTiers({
        searchParams: { filter: "type:paid", limit: "all" },
        enabled,
        defaultErrorHandler: false,
    });

    const stripeEnabled = settingsData?.settings && configData?.config
        ? checkStripeEnabled(settingsData.settings, configData.config)
        : false;

    const segmentGroups: RecipientSegmentGroup[] = [];

    const labels = labelsData?.labels ?? [];
    if (labels.length > 0) {
        segmentGroups.push({
            name: "Labels",
            options: labels.map(label => ({ name: label.name, segment: `label:${label.slug}` })),
        });
    }

    const tiers = tiersData?.tiers ?? [];
    if (tiers.length > 1) {
        const activeTiers = tiers.filter(tier => tier.active);
        const archivedTiers = tiers.filter(tier => !tier.active);
        segmentGroups.push(
            { name: "Active tiers", options: activeTiers.map(tier => ({ name: tier.name, segment: `tier:${tier.slug}` })) },
            { name: "Archived tiers", options: archivedTiers.map(tier => ({ name: tier.name, segment: `tier:${tier.slug}` })) },
        );
    }

    return {
        stripeEnabled,
        segmentGroups: segmentGroups.filter(group => group.options.length > 0),
    };
}

// Ember's default email-verification message (PublishOptions._checkSendingLimit)
const EMAIL_VERIFICATION_MESSAGE = "Email sending is temporarily disabled because your account is currently in review. You should have an email about this from us already, but you can also reach us any time at support@ghost.org.";

/**
 * Gathers everything Ember's PublishOptions fetched in setupTask
 * (settings, config, user, newsletters, member count) into the pure
 * PublishOptionsInput shape. Returns null until all required data is loaded
 * so the publish flow can derive correct defaults (e.g. 'publish' when there
 * are no members) on first render.
 *
 * Deviation from Ember: host limit checks (emails/members limits) are not
 * ported yet, so publishDisabledError never occurs.
 */
export function usePublishOptionsInput(post: FullPost, resource: EditorResource): PublishOptionsInput | null {
    const { data: settingsData } = useBrowseSettings();
    const { data: configData } = useBrowseConfig();
    const { data: currentUser } = useCurrentUser();

    // Ember's user.isAdmin covers both Owner and Administrator roles
    const isAdmin = currentUser ? (isOwnerUser(currentUser) || isAdminUser(currentUser)) : false;
    const isContributor = currentUser ? isContributorUser(currentUser) : false;

    // contributors cannot browse newsletters (Ember skips the query for them)
    const { data: newslettersData } = useBrowseNewsletters({
        enabled: Boolean(currentUser) && !isContributor,
    });

    // only Admins/Owners can browse members; Ember substitutes a count of 1
    // for other roles so email isn't disabled for "no members".
    // refetchOnMount: the count gates email availability, and members may
    // have been added since the cached count was read (Ember re-fetched it
    // in publishOptions.setup every time the flow opened) — a stale 0 would
    // wrongly disable the email publish types.
    const { data: membersData } = useBrowseMembers({
        searchParams: { limit: "1" },
        enabled: Boolean(currentUser) && isAdmin,
        refetchOnMount: "always",
        staleTime: 0,
    });

    const settings = settingsData?.settings;
    const config = configData?.config;

    const ready = Boolean(settings)
        && Boolean(config)
        && Boolean(currentUser)
        && (isContributor || Boolean(newslettersData))
        && (!isAdmin || Boolean(membersData));

    if (!ready) {
        return null;
    }

    const mailgunSettingsConfigured = Boolean(getSettingValue<string>(settings, "mailgun_api_key"))
        && Boolean(getSettingValue<string>(settings, "mailgun_domain"))
        && Boolean(getSettingValue<string>(settings, "mailgun_base_url"));

    const emailVerificationRequired = getSettingValue<boolean>(settings, "email_verification_required") ?? false;

    return {
        post: {
            id: post.id,
            isPage: resource === "pages",
            status: post.status as PublishOptionsInput["post"]["status"],
            visibility: post.visibility,
            tierSlugs: (post.tiers ?? []).map(tier => tier.slug ?? "").filter(Boolean),
            hasEmail: Boolean(post.email),
            emailStatus: post.email?.status ?? null,
            newsletterSlug: post.newsletter?.slug ?? null,
            emailSegment: post.email_segment ?? null,
        },
        settings: {
            editorDefaultEmailRecipients: getSettingValue<string>(settings, "editor_default_email_recipients") ?? "visibility",
            editorDefaultEmailRecipientsFilter: getSettingValue<string>(settings, "editor_default_email_recipients_filter") ?? null,
            membersSignupAccess: getSettingValue<string>(settings, "members_signup_access") ?? "all",
            defaultContentVisibility: getSettingValue<string>(settings, "default_content_visibility") ?? "public",
            mailgunIsConfigured: mailgunSettingsConfigured || Boolean(config?.mailgunIsConfigured),
        },
        user: { isAdmin, isContributor },
        newsletters: (newslettersData?.newsletters ?? []).map(newsletter => ({
            id: newsletter.id,
            slug: newsletter.slug,
            name: newsletter.name,
            status: newsletter.status,
            sortOrder: newsletter.sort_order,
            visibility: newsletter.visibility,
        })),
        totalMemberCount: isAdmin ? (membersData?.meta?.pagination.total ?? 0) : 1,
        emailDisabledError: emailVerificationRequired ? EMAIL_VERIFICATION_MESSAGE : null,
    };
}
