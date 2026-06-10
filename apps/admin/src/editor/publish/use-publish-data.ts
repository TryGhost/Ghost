import { useBrowseConfig } from "@tryghost/admin-x-framework/api/config";
import { useCurrentUser } from "@tryghost/admin-x-framework/api/current-user";
import { type EditorResource, type FullPost } from "@tryghost/admin-x-framework/api/editor";
import { useBrowseMembers } from "@tryghost/admin-x-framework/api/members";
import { useBrowseNewsletters } from "@tryghost/admin-x-framework/api/newsletters";
import { getSettingValue, useBrowseSettings } from "@tryghost/admin-x-framework/api/settings";
import { isAdminUser, isContributorUser, isOwnerUser } from "@tryghost/admin-x-framework/api/users";
import { type PublishOptionsInput } from "./publish-options";

/** Site timezone setting, 'Etc/UTC' until settings load. */
export function useSiteTimezone(): string {
    const { data } = useBrowseSettings();
    return getSettingValue<string>(data?.settings, "timezone") ?? "Etc/UTC";
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
    // for other roles so email isn't disabled for "no members"
    const { data: membersData } = useBrowseMembers({
        searchParams: { limit: "1" },
        enabled: Boolean(currentUser) && isAdmin,
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
