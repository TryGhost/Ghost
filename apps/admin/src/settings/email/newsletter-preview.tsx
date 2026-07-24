import { getSettingValues, useBrowseSettings } from "@tryghost/admin-x-framework/api/settings";
import { textColorForBackgroundColor } from "@tryghost/color-utils";
import { useBrowseConfig } from "@tryghost/admin-x-framework/api/config";
import { useBrowseSite } from "@tryghost/admin-x-framework/api/site";
import { useCurrentUser } from "@tryghost/admin-x-framework/api/current-user";
import type { Newsletter } from "@tryghost/admin-x-framework/api/newsletters";

import { NewsletterPreviewContent } from "./newsletter-preview-content";
import { renderReplyToEmail, renderSenderEmail } from "@/automations/utils/newsletter-emails";

/**
 * Maps a newsletter's design settings onto the static preview document,
 * ported from the legacy newsletter-preview.tsx (same color resolution
 * rules), on the framework hooks instead of GlobalDataProvider.
 */
export function NewsletterPreview({ newsletter }: { newsletter: Newsletter }) {
    const { data: settingsData } = useBrowseSettings();
    const { data: configData } = useBrowseConfig();
    const { data: siteResponse } = useBrowseSite();
    const { data: currentUser } = useCurrentUser();
    const settings = settingsData?.settings ?? [];
    const config = configData?.config;
    const siteData = siteResponse?.site;
    const [title, icon, commentsEnabled, supportEmailAddress, defaultEmailAddress] = getSettingValues<string>(settings, ["title", "icon", "comments_enabled", "support_email_address", "default_email_address"]);

    if (!config || !siteData) {
        return null;
    }

    let headerTitle: string | null = null;
    if (newsletter.show_header_title) {
        headerTitle = title || null;
    } else if (newsletter.show_header_name) {
        headerTitle = newsletter.name;
    }

    const headerSubtitle = (newsletter.show_header_title && newsletter.show_header_name) ? newsletter.name : undefined;

    const showCommentCta = newsletter.show_comment_cta && commentsEnabled !== "off";
    const showFeedback = newsletter.feedback_enabled;
    const showShareButton = newsletter.show_share_button;

    const validHex = /#([0-9a-f]{3}){1,2}$/i;

    const backgroundColor = () => {
        const value = newsletter.background_color;

        if (validHex.test(value)) {
            return value;
        }

        return "#ffffff";
    };

    const headerBackgroundColor = () => {
        const value = newsletter.header_background_color;

        if (!value || value === "transparent") {
            return "transparent";
        }

        if (validHex.test(value)) {
            return value;
        }

        return "transparent";
    };

    const buttonColor = () => {
        const value = newsletter.button_color;

        if (validHex.test(value || "")) {
            return value;
        }

        if (value === null) {
            const bg = backgroundColor();
            return textColorForBackgroundColor(bg).hex();
        }

        return siteData.accent_color;
    };

    const buttonTextColor = () => {
        const buttonStyle = newsletter.button_style;
        const calcButtonColor = buttonColor();

        if (calcButtonColor && buttonStyle === "fill") {
            return textColorForBackgroundColor(calcButtonColor).hex();
        }

        return undefined;
    };

    const linkColor = () => {
        const value = newsletter.link_color === undefined ? "accent" : newsletter.link_color;

        if (value === "accent") {
            return siteData.accent_color;
        }

        if (validHex.test(value || "")) {
            return value;
        }

        return textColorForBackgroundColor(backgroundColor()).hex();
    };

    const postTitleColor = () => {
        const value = newsletter.post_title_color;

        if (validHex.test(value || "")) {
            return value;
        }

        if (value === "accent") {
            return siteData.accent_color;
        }

        const headerBgColor = headerBackgroundColor();
        const bgColor = headerBgColor === "transparent" ? backgroundColor() : headerBgColor;

        return textColorForBackgroundColor(bgColor).hex();
    };

    const sectionTitleColor = () => {
        const value = newsletter.section_title_color;

        if (validHex.test(value || "")) {
            return value;
        }

        if (value === "accent") {
            return siteData.accent_color;
        }

        return textColorForBackgroundColor(backgroundColor()).hex();
    };

    const dividerColor = () => {
        const value = newsletter.divider_color;

        if (validHex.test(value || "")) {
            return value;
        }

        if (value === "accent") {
            return siteData.accent_color;
        }

        return "#e0e7eb";
    };

    const textColor = textColorForBackgroundColor(backgroundColor()).hex();
    const secondaryTextColor = textColorForBackgroundColor(backgroundColor()).alpha(0.5).toString();

    const headerTextColor = headerBackgroundColor() === "transparent" ? textColor : textColorForBackgroundColor(headerBackgroundColor()).hex();
    const secondaryHeaderTextColor = headerBackgroundColor() === "transparent" ? secondaryTextColor : textColorForBackgroundColor(headerBackgroundColor()).alpha(0.5).toString();

    const colors = {
        backgroundColor: backgroundColor(),
        headerBackgroundColor: headerBackgroundColor(),
        postTitleColor: postTitleColor() || undefined,
        sectionTitleColor: sectionTitleColor() || undefined,
        buttonColor: buttonColor() || undefined,
        buttonTextColor: buttonTextColor() || undefined,
        linkColor: linkColor() || undefined,
        dividerColor: dividerColor() || undefined,
        textColor,
        secondaryTextColor,
        headerTextColor,
        secondaryHeaderTextColor,
    };

    return (
        <NewsletterPreviewContent
            accentColor={siteData.accent_color}
            authorPlaceholder={currentUser?.name || currentUser?.email}
            bodyFontCategory={newsletter.body_font_category}
            buttonCorners={newsletter.button_corners || "rounded"}
            buttonStyle={newsletter.button_style || "fill"}
            dividerStyle={newsletter.divider_style || "solid"}
            footerContent={newsletter.footer_content}
            headerIcon={newsletter.show_header_icon ? icon : undefined}
            headerImage={newsletter.header_image}
            headerSubtitle={headerSubtitle}
            headerTitle={headerTitle}
            imageCorners={newsletter.image_corners || "square"}
            linkStyle={newsletter.link_style || "underline"}
            senderEmail={renderSenderEmail(newsletter, config, defaultEmailAddress)}
            senderName={newsletter.sender_name || title}
            senderReplyTo={renderReplyToEmail(newsletter, config, supportEmailAddress, defaultEmailAddress)}
            showBadge={newsletter.show_badge}
            showCommentCta={showCommentCta}
            showExcerpt={newsletter.show_excerpt}
            showFeatureImage={newsletter.show_feature_image}
            showFeedback={showFeedback}
            showLatestPosts={newsletter.show_latest_posts}
            showPostTitleSection={newsletter.show_post_title_section}
            showShareButton={showShareButton}
            showSubscriptionDetails={newsletter.show_subscription_details}
            siteTitle={title}
            titleAlignment={newsletter.title_alignment}
            titleFontCategory={newsletter.title_font_category}
            titleFontWeight={newsletter.title_font_weight || "bold"}
            {...colors}
        />
    );
}
