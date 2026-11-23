import NewsletterPreviewContent from './newsletter-preview-content';
import React from 'react';
import { type Newsletter } from '@tryghost/admin-x-framework/api/newsletters';
import { getSettingValues } from '@tryghost/admin-x-framework/api/settings';
import { renderReplyToEmail, renderSenderEmail } from '@/settings/utils/newsletter-emails';
import { textColorForBackgroundColor } from '@tryghost/color-utils';
import { useGlobalData } from '@/settings/providers/global-data-context';
import { DEFAULT_SPACING, type NewsletterSpacing, type PreviewDevice } from './newsletter-spacing';
import { DEFAULT_CARD_DESIGN, type NewsletterCardDesign, hasCard } from './newsletter-card';
import { DEFAULT_TITLE_META, type NewsletterTitleMeta } from './newsletter-title-meta';

const NewsletterPreview: React.FC<{
  newsletter: Newsletter;
  /** Prototype: margin and line spacing stops, preview only. */
  spacing?: NewsletterSpacing;
  device?: PreviewDevice;
  /** Prototype: content background (card look) and its corners, preview only. */
  card?: NewsletterCardDesign;
  /** Prototype: byline and "View in browser" visibility, preview only. */
  titleMeta?: NewsletterTitleMeta;
}> = ({
  newsletter,
  spacing = DEFAULT_SPACING,
  device = 'desktop',
  card = DEFAULT_CARD_DESIGN,
  titleMeta = DEFAULT_TITLE_META,
}) => {
  const { currentUser, settings, siteData, config } = useGlobalData();
  const [title, icon, commentsEnabled, supportEmailAddress, defaultEmailAddress] =
    getSettingValues<string>(settings, [
      'title',
      'icon',
      'comments_enabled',
      'support_email_address',
      'default_email_address',
    ]);

  let headerTitle: string | null = null;
  if (newsletter.show_header_title) {
    headerTitle = title || null;
  } else if (newsletter.show_header_name) {
    headerTitle = newsletter.name;
  }

  const headerSubtitle =
    newsletter.show_header_title && newsletter.show_header_name ? newsletter.name : undefined;

  const showCommentCta = newsletter.show_comment_cta && commentsEnabled !== 'off';
  const showFeedback = newsletter.feedback_enabled;
  const showShareButton = newsletter.show_share_button;

  const backgroundColor = () => {
    const value = newsletter.background_color;

    const validHex = /#([0-9a-f]{3}){1,2}$/i;

    if (validHex.test(value)) {
      return value;
    }

    return '#ffffff';
  };

  const headerBackgroundColor = () => {
    const value = newsletter.header_background_color;

    if (!value || value === 'transparent') {
      return 'transparent';
    }

    const validHex = /#([0-9a-f]{3}){1,2}$/i;

    if (validHex.test(value)) {
      return value;
    }

    return 'transparent';
  };

  /** The card's colour when the card look is on, otherwise undefined (no card). */
  const cardBackgroundColor = () => {
    if (!hasCard(card)) {
      return undefined;
    }

    const validHex = /#([0-9a-f]{3}){1,2}$/i;

    if (validHex.test(card.contentBackground)) {
      return card.contentBackground;
    }

    return '#ffffff';
  };

  // The colour the content sits on, so the one that text, links, buttons and titles derive from:
  // the card when the card look is on, otherwise the email background. The page colour around
  // the card never carries text.
  const contentSurfaceColor = () => cardBackgroundColor() ?? backgroundColor();

  const buttonColor = () => {
    const value = newsletter.button_color;

    const validHex = /#([0-9a-f]{3}){1,2}$/i;

    if (validHex.test(value || '')) {
      return value;
    }

    if (value === null) {
      const bg = contentSurfaceColor();
      return textColorForBackgroundColor(bg).hex();
    }

    return siteData.accent_color;
  };

  const buttonTextColor = () => {
    const buttonStyle = newsletter.button_style;
    const calcButtonColor = buttonColor();

    if (calcButtonColor && buttonStyle === 'fill') {
      return textColorForBackgroundColor(calcButtonColor).hex();
    }

    return undefined;
  };

  const linkColor = () => {
    const value = newsletter.link_color === undefined ? 'accent' : newsletter.link_color;

    const validHex = /#([0-9a-f]{3}){1,2}$/i;

    if (value === 'accent') {
      return siteData.accent_color;
    }

    if (validHex.test(value || '')) {
      return value;
    }

    return textColorForBackgroundColor(contentSurfaceColor()).hex();
  };

  const postTitleColor = () => {
    const value = newsletter.post_title_color;

    const validHex = /#([0-9a-f]{3}){1,2}$/i;

    if (validHex.test(value || '')) {
      return value;
    }

    if (value === 'accent') {
      return siteData.accent_color;
    }

    const headerBgColor = headerBackgroundColor();
    const bgColor = headerBgColor === 'transparent' ? contentSurfaceColor() : headerBgColor;

    return textColorForBackgroundColor(bgColor).hex();
  };

  const sectionTitleColor = () => {
    const value = newsletter.section_title_color;

    const validHex = /#([0-9a-f]{3}){1,2}$/i;

    if (validHex.test(value || '')) {
      return value;
    }

    if (value === 'accent') {
      return siteData.accent_color;
    }

    return textColorForBackgroundColor(contentSurfaceColor()).hex();
  };

  const dividerColor = () => {
    const value = newsletter.divider_color;

    const validHex = /#([0-9a-f]{3}){1,2}$/i;

    if (validHex.test(value || '')) {
      return value;
    }

    if (value === 'accent') {
      return siteData.accent_color;
    }

    return '#e0e7eb';
  };

  const textColor = textColorForBackgroundColor(contentSurfaceColor()).hex();
  const secondaryTextColor = textColorForBackgroundColor(contentSurfaceColor())
    .alpha(0.5)
    .toString();

  const headerTextColor =
    headerBackgroundColor() === 'transparent'
      ? textColor
      : textColorForBackgroundColor(headerBackgroundColor()).hex();
  const secondaryHeaderTextColor =
    headerBackgroundColor() === 'transparent'
      ? secondaryTextColor
      : textColorForBackgroundColor(headerBackgroundColor()).alpha(0.5).toString();

  type Colors = {
    backgroundColor?: string;
    headerBackgroundColor?: string;
    postTitleColor?: string;
    sectionTitleColor?: string;
    buttonColor?: string;
    buttonTextColor?: string;
    linkColor?: string;
    dividerColor?: string;
    textColor?: string;
    secondaryTextColor?: string;
    headerTextColor?: string;
    secondaryHeaderTextColor?: string;
  };

  const colors: Colors = {
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
      authorPlaceholder={currentUser.name || currentUser.email}
      backgroundColor={colors.backgroundColor || '#ffffff'}
      bodyFontCategory={newsletter.body_font_category}
      buttonCorners={newsletter.button_corners || 'rounded'}
      buttonStyle={newsletter.button_style || 'fill'}
      cardBackgroundColor={cardBackgroundColor()}
      cardCorners={card.contentCorners}
      device={device}
      dividerStyle={newsletter.divider_style || 'solid'}
      footerContent={newsletter.footer_content}
      headerBackgroundColor={colors.headerBackgroundColor || 'transparent'}
      headerIcon={newsletter.show_header_icon ? icon : undefined}
      headerImage={newsletter.header_image}
      headerSubtitle={headerSubtitle}
      headerTitle={headerTitle}
      imageCorners={newsletter.image_corners || 'square'}
      linkStyle={newsletter.link_style || 'underline'}
      senderEmail={renderSenderEmail(newsletter, config, defaultEmailAddress)}
      senderName={newsletter.sender_name || title}
      senderReplyTo={renderReplyToEmail(
        newsletter,
        config,
        supportEmailAddress,
        defaultEmailAddress,
      )}
      showBadge={newsletter.show_badge}
      showByline={titleMeta.showByline}
      showCommentCta={showCommentCta}
      showExcerpt={newsletter.show_excerpt}
      showFeatureImage={newsletter.show_feature_image}
      showFeedback={showFeedback}
      showLatestPosts={newsletter.show_latest_posts}
      showPostTitleSection={newsletter.show_post_title_section}
      showShareButton={showShareButton}
      showSubscriptionDetails={newsletter.show_subscription_details}
      showViewInBrowser={titleMeta.showViewInBrowser}
      siteTitle={title}
      spacing={spacing}
      titleAlignment={newsletter.title_alignment}
      titleFontCategory={newsletter.title_font_category}
      titleFontWeight={newsletter.title_font_weight || 'bold'}
      {...colors}
    />
  );
};

export default NewsletterPreview;
