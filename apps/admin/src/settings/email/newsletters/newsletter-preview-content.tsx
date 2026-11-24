import CoverImage from '@/settings/assets/images/user-cover.jpg';
import LatestPosts1 from '@/settings/assets/images/latest-posts-1.jpg';
import LatestPosts2 from '@/settings/assets/images/latest-posts-2.jpg';
import LatestPosts3 from '@/settings/assets/images/latest-posts-3.jpg';
import clsx from 'clsx';
import { GhostOrb, PreviewChrome } from '@tryghost/shade/components';
import { LucideIcon } from '@tryghost/shade/utils';
import { isManagedEmail } from '@tryghost/admin-x-framework/api/config';
import { useGlobalData } from '@/settings/providers/global-data-context';
import {
  DEFAULT_SPACING,
  type NewsletterSpacing,
  type PreviewDevice,
  resolveNewsletterSpacing,
} from './newsletter-spacing';
import { CARD_PAGE_BAND_PX, CARD_RADIUS_PX, type ContentCorners } from './newsletter-card';
import { DEFAULT_DIVIDER_STYLE, type DividerStyle } from './newsletter-divider';
import { DividerLine } from './newsletter-divider-line';
import {
  MONO_BODY_FONT_SIZE,
  MONO_BODY_TRACKING_CLASS,
  MONO_FONT_CATEGORY,
  SYSTEM_MONO_CLASS,
} from './newsletter-fonts';
import { PREVIEW_CAPTURE_ATTRIBUTE } from './newsletter-preview-screenshot';

// Phone sizes from the real email's `@media (max-width: 620px)` rules
// (ghost/core/server/services/email-service/email-templates/partials/styles.hbs).
const PHONE_BODY_FONT_SIZE = 16;
const PHONE_POST_TITLE = { fontSize: 26, lineHeight: 1.1 };
const PHONE_EXCERPT_FONT_SIZE = 16;
const PHONE_H3 = { fontSize: 21, lineHeight: 1.25 };
const PHONE_LATEST_POST_TITLE_FONT_SIZE = 15;
const PHONE_HR_MARGIN = '2em 0';
// Space above the first thing in the header, so the top of the email never feels cramped.
const HEADER_TOP_PX = { desktop: 40, mobile: 32 };

const NewsletterPreviewContent: React.FC<{
  senderName?: string;
  senderEmail: string | null;
  senderReplyTo: string | null;
  headerImage?: string | null;
  headerIcon?: string;
  headerTitle?: string | null;
  headerSubtitle?: string | null;
  showPostTitleSection: boolean;
  showExcerpt: boolean;
  titleAlignment?: string;
  titleFontCategory?: string;
  titleFontWeight?: string;
  bodyFontCategory?: string;
  authorPlaceholder?: string;

  showCommentCta: boolean;
  showFeatureImage: boolean;
  showFeedback: boolean;
  showShareButton: boolean;
  showLatestPosts: boolean;
  showSubscriptionDetails: boolean;

  siteTitle?: string;
  footerContent?: string | null;
  showBadge?: boolean;

  backgroundColor?: string;
  /** Prototype: the card's colour when the card look is on; undefined keeps today's flat look. */
  cardBackgroundColor?: string;
  cardCorners?: ContentCorners;
  /** Prototype: show the byline row ("By [author] • date"). */
  showByline?: boolean;
  /** Prototype: show the "View in browser" link. */
  showViewInBrowser?: boolean;
  headerBackgroundColor?: string;
  accentColor?: string;
  textColor?: string;
  secondaryTextColor?: string;
  headerTextColor?: string;
  secondaryHeaderTextColor?: string;
  postTitleColor?: string;
  sectionTitleColor?: string;
  dividerColor?: string;
  buttonColor?: string;
  buttonTextColor?: string;
  linkColor?: string;
  buttonStyle?: string;
  buttonCorners?: string;
  imageCorners?: string;
  linkStyle?: string;
  dividerStyle?: DividerStyle;

  /** Prototype: margin and line spacing stops. Defaults match today's email. */
  spacing?: NewsletterSpacing;
  device?: PreviewDevice;
}> = ({
  senderName,
  senderEmail,
  senderReplyTo,
  headerImage,
  headerIcon,
  headerTitle,
  headerSubtitle,
  showPostTitleSection,
  showExcerpt,
  showByline = true,
  showViewInBrowser = true,
  titleAlignment,
  titleFontCategory,
  titleFontWeight,
  bodyFontCategory,
  authorPlaceholder,

  showCommentCta,
  showFeatureImage,
  showFeedback,
  showShareButton,
  showLatestPosts,
  showSubscriptionDetails,

  siteTitle,
  footerContent,
  showBadge,

  backgroundColor,
  cardBackgroundColor,
  cardCorners = 'rounded',
  headerBackgroundColor,
  accentColor,
  textColor,
  secondaryTextColor,
  headerTextColor,
  secondaryHeaderTextColor,
  postTitleColor,
  sectionTitleColor,
  dividerColor,
  buttonColor,
  buttonTextColor,
  linkColor,
  buttonCorners,
  buttonStyle,
  imageCorners,
  linkStyle,
  dividerStyle = DEFAULT_DIVIDER_STYLE,
  spacing = DEFAULT_SPACING,
  device = 'desktop',
}) => {
  const showHeader = headerIcon || headerTitle;
  const { config } = useGlobalData();

  const isPhone = device === 'mobile';
  const { gutter, lineHeight, paragraphGap } = resolveNewsletterSpacing(spacing, device);
  // Header, body and footer all sit inside the same 600px column, so one gutter keeps them aligned.
  // The footer adds its own 30px on top (`px-[30px]`), as the real `.footer` cells do.
  const columnStyle = { paddingLeft: gutter, paddingRight: gutter };
  const bodyFontSize =
    bodyFontCategory === MONO_FONT_CATEGORY
      ? MONO_BODY_FONT_SIZE[isPhone ? 'mobile' : 'desktop']
      : isPhone
        ? PHONE_BODY_FONT_SIZE
        : bodyFontCategory === 'serif'
          ? 18
          : 17;
  const paragraphStyle = { color: textColor, lineHeight, marginBottom: `${paragraphGap}em` };
  const latestPostTitleStyle = isPhone ? { fontSize: PHONE_LATEST_POST_TITLE_FONT_SIZE } : {};
  // On phones the card runs edge to edge, so its corners are always square.
  const cardRadius = !isPhone && cardCorners === 'rounded' ? CARD_RADIUS_PX : 0;

  const currentDate = new Date().toLocaleDateString('default', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
  const currentYear = new Date().getFullYear();

  // Process footer content to add target and rel attributes to links
  const processedFooterContent = footerContent
    ? footerContent.replace(/<a/g, '<a target="_blank" rel="noopener noreferrer"')
    : '';

  let emailHeader;

  if (isManagedEmail(config)) {
    emailHeader = (
      <>
        <p className="leading-normal">
          <span className="font-semibold text-gray-900">From: </span>
          <span>
            {senderName} ({senderEmail})
          </span>
        </p>
        <p className="leading-normal">
          <span className="font-semibold text-gray-900">Reply-to: </span>
          {senderReplyTo ? senderReplyTo : senderEmail}
        </p>
      </>
    );
  } else {
    emailHeader = (
      <>
        <p className="leading-normal">
          <span className="font-semibold text-gray-900">{senderName}</span>
          <span> {senderEmail}</span>
        </p>
        <p className="leading-normal">
          <span className="font-semibold text-gray-900">To:</span> Jamie Larson jamie@example.com
        </p>
      </>
    );
  }

  let excerptClasses = 'mb-5 text-pretty leading-[1.7] text-black';

  if (titleFontCategory === 'serif' && bodyFontCategory === 'serif') {
    excerptClasses = clsx(excerptClasses, 'mb-8 font-serif text-[2.0rem] leading-tight');
  } else if (titleFontCategory !== 'serif' && bodyFontCategory === 'serif') {
    excerptClasses = clsx(excerptClasses, 'mb-8 text-[1.7rem] leading-tight tracking-tight');
  } else if (titleFontCategory === 'serif' && bodyFontCategory !== 'serif') {
    excerptClasses = clsx(excerptClasses, 'mb-8 font-serif text-[2.0rem] leading-tight');
  } else {
    excerptClasses = clsx(excerptClasses, 'mb-8 text-[1.9rem] leading-tight tracking-tight');
  }

  // The excerpt follows the heading font; a mono heading gets a mono excerpt.
  if (titleFontCategory === MONO_FONT_CATEGORY) {
    excerptClasses = clsx(excerptClasses, SYSTEM_MONO_CLASS, 'tracking-normal');
  }

  if (titleAlignment === 'center') {
    excerptClasses = clsx(excerptClasses, 'text-center');
  }

  // Header area: header image, publication title and post title section, plus the feature image.
  const headerContent = (
    <>
      {/* In the card look the header image sits outside this padded area, filling the card's top. */}
      {headerImage && !cardBackgroundColor && (
        <div className="pt-6 first:pt-0">
          <img alt="" className="mb-4 block" src={headerImage} />
        </div>
      )}
      {showHeader && (
        <div className="py-3 first:pt-0">
          {headerIcon && (
            <img alt="" className="mx-auto mb-2 size-10" role="presentation" src={headerIcon} />
          )}
          {headerTitle && (
            <h4
              className="mb-1 text-center text-[1.6rem] leading-tight font-bold tracking-tight text-gray-900 uppercase"
              style={{ color: headerTextColor }}
            >
              {headerTitle}
            </h4>
          )}
          {headerSubtitle && (
            <h5
              className="mb-1 text-center text-[1.3rem] font-normal text-gray-700"
              style={{ color: secondaryHeaderTextColor }}
            >
              {headerSubtitle}
            </h5>
          )}
        </div>
      )}
      {showPostTitleSection && (
        <div
          className={clsx(
            'flex flex-col pt-8 first:pt-0',
            // Bottom padding belongs to the meta row; without it the title or excerpt's own gap is enough.
            (showByline || showViewInBrowser) && 'pb-8',
            titleAlignment === 'center' ? 'items-center' : 'items-start',
          )}
        >
          <h2
            className={clsx(
              'text-4xl leading-supertight font-bold text-black',
              titleFontCategory === 'serif' && 'font-serif',
              titleFontCategory === MONO_FONT_CATEGORY && SYSTEM_MONO_CLASS,
              titleFontWeight === 'normal' && 'font-normal',
              titleFontWeight === 'medium' && 'font-medium',
              titleFontWeight === 'semibold' && 'font-semibold',
              titleFontWeight === 'bold' && 'font-bold',
              titleAlignment === 'center' ? 'text-center' : 'text-left',
              showExcerpt ? 'mb-2' : 'mb-8',
            )}
            style={{ color: postTitleColor, ...(isPhone && PHONE_POST_TITLE) }}
          >
            Your email newsletter
          </h2>
          {showExcerpt && (
            <p
              className={excerptClasses}
              style={{
                color: headerTextColor,
                ...(isPhone && { fontSize: PHONE_EXCERPT_FONT_SIZE }),
              }}
            >
              A subtitle to highlight key points and engage your readers.
            </p>
          )}
          {(showByline || showViewInBrowser) && (
            <div
              className={clsx(
                'flex w-full justify-between text-center text-md leading-none text-gray-700',
                titleAlignment === 'center' ? 'flex-col gap-1' : 'flex-row',
              )}
            >
              {showByline && (
                <p className="pb-1 text-[1.3rem]" style={{ color: secondaryHeaderTextColor }}>
                  By {authorPlaceholder}
                  <span className="before:pr-1 before:pl-0.5 before:content-['•']">
                    {currentDate}
                  </span>
                </p>
              )}
              {showViewInBrowser && (
                <p
                  className="pb-1 text-[1.3rem] underline"
                  style={{ color: secondaryHeaderTextColor }}
                >
                  <span>View in browser</span>
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Feature image */}
      {showFeatureImage && (
        <>
          <div
            className={clsx(
              'h-[unset] w-full max-w-[600px] bg-cover bg-no-repeat first:pt-0',
              showPostTitleSection ? '' : 'pt-6',
            )}
          >
            <img
              alt="Feature"
              className={clsx(
                'min-h-full min-w-full shrink-0',
                imageCorners === 'square' && 'rounded-none',
                imageCorners === 'rounded' && 'rounded-md',
              )}
              src={CoverImage}
            />
          </div>
          <div
            className="mt-1 w-full max-w-[600px] pb-8 text-center text-[1.3rem] text-gray-700"
            style={{ color: secondaryHeaderTextColor }}
          >
            Feature image caption
          </div>
        </>
      )}
    </>
  );

  // Body area: post content, feedback, latest posts, subscription details and footer.
  const bodyContent = (
    <>
      <div
        className={clsx(
          'max-w-[600px] pb-[52px] leading-[27.2px] text-black',
          bodyFontCategory === 'serif' && 'font-serif',
          bodyFontCategory === MONO_FONT_CATEGORY && [SYSTEM_MONO_CLASS, MONO_BODY_TRACKING_CLASS],
          bodyFontCategory !== 'serif' &&
            bodyFontCategory !== MONO_FONT_CATEGORY &&
            'tracking-tight',
          showFeatureImage || showPostTitleSection ? '' : 'pt-8',
        )}
        style={{ fontSize: bodyFontSize }}
      >
        <p style={paragraphStyle}>
          This is what your content will look like when you send one of your posts as an email
          newsletter to your subscribers.
        </p>
        <p style={paragraphStyle}>
          Over there on the right you&apos;ll see some settings that allow you to customize the look
          and feel of this template – from colors and typography to layout and buttons – to make it
          perfectly suited to your brand.
        </p>
        <p style={paragraphStyle}>
          Email templates are exceptionally finnicky to make, but we&apos;ve spent a long time
          optimising this one to make it work beautifully across devices, email clients and content
          types. So, you can trust that every email you send with Ghost will look great and work
          well. Just like the rest of your site.
        </p>
        <DividerLine
          className="my-[52px]"
          color={dividerColor}
          dividerStyle={dividerStyle}
          style={isPhone ? { margin: PHONE_HR_MARGIN } : undefined}
        />
        <h3
          className={clsx(
            'mb-[13px] text-[2.6rem] leading-supertight',
            titleFontCategory === 'serif' && 'font-serif',
            titleFontCategory === MONO_FONT_CATEGORY && SYSTEM_MONO_CLASS,
            titleFontCategory === 'sans_serif' && 'font-sans',
            titleFontWeight === 'normal' && 'font-normal',
            titleFontWeight === 'medium' && 'font-medium',
            titleFontWeight === 'semibold' && 'font-semibold',
            titleFontWeight === 'bold' && 'font-bold',
          )}
          style={{ color: sectionTitleColor, ...(isPhone && PHONE_H3) }}
        >
          Need inspiration?
        </h3>
        <p style={paragraphStyle}>
          We&apos;ve put together a{' '}
          <a
            className={clsx(
              linkStyle === 'underline' && 'underline',
              linkStyle === 'bold' && 'font-bold',
            )}
            href="https://ghost.org/help/email-design/"
            rel="noopener noreferrer"
            style={{ color: linkColor || accentColor }}
            target="_blank"
          >
            quick guide
          </a>{' '}
          that walks through all of the available settings, along with a few examples of what&apos;s
          possible.
        </p>
        <a
          className={clsx(
            'inline-block border px-[18px] py-2 font-sans text-[15px]',
            buttonCorners === 'rounded' && 'rounded-[6px]',
            buttonCorners === 'pill' && 'rounded-full',
            buttonCorners === 'square' && 'rounded-none',
            buttonStyle === 'outline' ? 'bg-transparent' : 'border-transparent text-white',
            linkStyle === 'bold' ? 'font-bold' : 'font-semibold',
          )}
          href="https://ghost.org/help/email-design/"
          rel="noopener noreferrer"
          style={
            buttonStyle === 'outline'
              ? {
                  borderColor: buttonColor || accentColor,
                  color: buttonColor || accentColor,
                }
              : {
                  backgroundColor: buttonColor || accentColor,
                  color: buttonTextColor,
                }
          }
          target="_blank"
        >
          Learn more
        </a>
      </div>
      <DividerLine color={dividerColor} dividerStyle="thin" />

      {/* Feedback */}
      {(showFeedback || showCommentCta || showShareButton) && (
        <>
          <div className="grid gap-5 px-6 py-5">
            <div className="grid auto-cols-fr grid-flow-col gap-4">
              {showFeedback && (
                <>
                  <div className="pointer-events-none flex min-w-0 cursor-default flex-col items-center gap-[11px] text-center">
                    <span
                      className="inline-flex size-[54px] items-center justify-center rounded-full border"
                      style={{ borderColor: dividerColor, color: textColor }}
                    >
                      <LucideIcon.ThumbsUp className="size-5" />
                    </span>
                    <span
                      className="font-sans text-[1.3rem] leading-[1.4] font-medium"
                      style={{ color: textColor }}
                    >
                      More like this
                    </span>
                  </div>
                  <div className="pointer-events-none flex min-w-0 cursor-default flex-col items-center gap-[11px] text-center">
                    <span
                      className="inline-flex size-[54px] items-center justify-center rounded-full border"
                      style={{ borderColor: dividerColor, color: textColor }}
                    >
                      <LucideIcon.ThumbsDown className="size-5" />
                    </span>
                    <span
                      className="font-sans text-[1.3rem] leading-[1.4] font-medium"
                      style={{ color: textColor }}
                    >
                      Less like this
                    </span>
                  </div>
                </>
              )}
              {showCommentCta && (
                <div className="pointer-events-none flex min-w-0 cursor-default flex-col items-center gap-[11px] text-center">
                  <span
                    className="inline-flex size-[54px] items-center justify-center rounded-full border"
                    style={{ borderColor: dividerColor, color: textColor }}
                  >
                    <LucideIcon.MessageCircle className="size-5" />
                  </span>
                  <span
                    className="font-sans text-[1.3rem] leading-[1.4] font-medium"
                    style={{ color: textColor }}
                  >
                    Comment
                  </span>
                </div>
              )}
              {showShareButton && (
                <div className="pointer-events-none flex min-w-0 cursor-default flex-col items-center gap-[11px] text-center">
                  <span
                    className="inline-flex size-[54px] items-center justify-center rounded-full border"
                    style={{ borderColor: dividerColor, color: textColor }}
                  >
                    <LucideIcon.Share2 className="size-5" />
                  </span>
                  <span
                    className="font-sans text-[1.3rem] leading-[1.4] font-medium"
                    style={{ color: textColor }}
                  >
                    Share
                  </span>
                </div>
              )}
            </div>
          </div>
          <DividerLine color={dividerColor} dividerStyle="thin" />
        </>
      )}

      {/* Latest posts */}
      {showLatestPosts && (
        <>
          <div className="py-6">
            <h3
              className="mt-2 mb-4 pb-1 text-[1.2rem] font-semibold tracking-wide text-black uppercase"
              style={{ color: textColor }}
            >
              Keep reading
            </h3>
            <div className="flex justify-between gap-4 py-2">
              <div>
                <h4
                  className={clsx(
                    'mt-0.5 text-[1.9rem] text-black',
                    titleFontCategory === 'serif' && 'font-serif',
                    titleFontCategory === MONO_FONT_CATEGORY && SYSTEM_MONO_CLASS,
                    titleFontWeight === 'normal' && 'font-normal',
                    titleFontWeight === 'medium' && 'font-medium',
                    titleFontWeight === 'semibold' && 'font-semibold',
                    titleFontWeight === 'bold' && 'font-bold',
                  )}
                  style={{ color: sectionTitleColor, ...latestPostTitleStyle }}
                >
                  The three latest posts published on your site
                </h4>
                <p className="m-0 text-base text-gray-700" style={{ color: secondaryTextColor }}>
                  Posts sent as an email only will never be shown here.
                </p>
              </div>
              <div className="aspect-square h-auto w-full max-w-[100px] bg-cover bg-no-repeat">
                <img
                  alt="Latest post"
                  className={clsx(
                    imageCorners === 'square' && 'rounded-none',
                    imageCorners === 'rounded' && 'rounded-md',
                  )}
                  src={LatestPosts1}
                />
              </div>
            </div>
            <div className="flex justify-between gap-4 py-2">
              <div>
                <h4
                  className={clsx(
                    'mt-0.5 text-[1.9rem] text-black',
                    titleFontCategory === 'serif' && 'font-serif',
                    titleFontCategory === MONO_FONT_CATEGORY && SYSTEM_MONO_CLASS,
                    titleFontWeight === 'normal' && 'font-normal',
                    titleFontWeight === 'medium' && 'font-medium',
                    titleFontWeight === 'semibold' && 'font-semibold',
                    titleFontWeight === 'bold' && 'font-bold',
                  )}
                  style={{ color: sectionTitleColor, ...latestPostTitleStyle }}
                >
                  Displayed at the bottom of each newsletter
                </h4>
                <p className="m-0 text-base text-gray-700" style={{ color: secondaryTextColor }}>
                  Giving your readers one more place to discover your stories.
                </p>
              </div>
              <div className="aspect-square h-auto w-full max-w-[100px] bg-cover bg-no-repeat">
                <img
                  alt="Latest post"
                  className={clsx(
                    imageCorners === 'square' && 'rounded-none',
                    imageCorners === 'rounded' && 'rounded-md',
                  )}
                  src={LatestPosts2}
                />
              </div>
            </div>
            <div className="flex justify-between gap-4 py-2">
              <div>
                <h4
                  className={clsx(
                    'mt-0.5 text-[1.9rem] text-black',
                    titleFontCategory === 'serif' && 'font-serif',
                    titleFontCategory === MONO_FONT_CATEGORY && SYSTEM_MONO_CLASS,
                    titleFontWeight === 'normal' && 'font-normal',
                    titleFontWeight === 'medium' && 'font-medium',
                    titleFontWeight === 'semibold' && 'font-semibold',
                    titleFontWeight === 'bold' && 'font-bold',
                  )}
                  style={{ color: sectionTitleColor, ...latestPostTitleStyle }}
                >
                  To keep your work front and center
                </h4>
                <p className="m-0 text-base text-gray-700" style={{ color: secondaryTextColor }}>
                  Making sure that your audience stays engaged.
                </p>
              </div>
              <div className="aspect-square h-auto w-full max-w-[100px] bg-cover bg-no-repeat">
                <img
                  alt="Latest post"
                  className={clsx(
                    imageCorners === 'square' && 'rounded-none',
                    imageCorners === 'rounded' && 'rounded-md',
                  )}
                  src={LatestPosts3}
                />
              </div>
            </div>
          </div>
          <DividerLine color={dividerColor} dividerStyle="thin" />
        </>
      )}

      {/* Subscription details */}
      {showSubscriptionDetails && (
        <>
          <div className="py-8">
            <h4
              className="mb-3 text-[1.2rem] tracking-wide text-black uppercase"
              style={{ color: textColor }}
            >
              Subscription details
            </h4>
            <p className="m-0 mb-4 text-base" style={{ color: textColor }}>
              You are receiving this because you are a paid subscriber to {siteTitle}. Your
              subscription will renew on 17 Jul 2024.
            </p>
            <div className="flex">
              <div className="shrink-0 text-base">
                <p style={{ color: textColor }}>Name: Jamie Larson</p>
                <p style={{ color: textColor }}>Email: jamie@example.com</p>
                <p style={{ color: textColor }}>Member since: 17 July 2023</p>
              </div>
              <span
                className={clsx(
                  'w-full self-end text-right text-base whitespace-nowrap',
                  linkStyle === 'underline' && 'underline',
                  linkStyle === 'bold' && 'font-bold',
                )}
                style={{ color: linkColor || accentColor }}
              >
                Manage subscription
              </span>
            </div>
          </div>
          <DividerLine color={dividerColor} dividerStyle="thin" />
        </>
      )}

      {/* Footer */}
      <div className="flex flex-col items-center pt-10">
        <div
          dangerouslySetInnerHTML={{ __html: processedFooterContent || '' }}
          className="text px-[30px] py-3 text-center text-[1.3rem] leading-base break-words text-gray-700 [&_a]:underline"
          style={{ color: secondaryTextColor }}
        />

        <div className="px-[30px] pt-3 pb-14 text-center text-[1.3rem] text-gray-700">
          <span style={{ color: secondaryTextColor }}>
            {siteTitle} © {currentYear} &mdash;{' '}
          </span>
          <span
            className="pointer-events-none cursor-auto underline"
            style={{ color: secondaryTextColor }}
          >
            Unsubscribe
          </span>
        </div>

        {showBadge && (
          <div className="flex flex-col items-center pt-[10px] pb-[40px]">
            <a
              className="pointer-events-none inline-flex cursor-auto items-center px-2 py-1 text-[1.25rem] font-semibold tracking-tight text-gray-900"
              href="https://ghost.org"
              style={{ color: textColor }}
            >
              <GhostOrb className="mr-[6px] size-4" />
              <span>Powered by Ghost</span>
            </a>
          </div>
        )}
      </div>
    </>
  );

  const headerBand = { backgroundColor: headerBackgroundColor };
  // One consistent top padding above whatever comes first in the header (image, publication
  // info, post title or feature image); each of those drops its own top padding when first.
  const headerStyle = {
    ...columnStyle,
    paddingTop: isPhone ? HEADER_TOP_PX.mobile : HEADER_TOP_PX.desktop,
  };
  const bodyClassName = clsx(
    'mx-auto max-w-[600px]',
    headerBackgroundColor !== 'transparent' && 'pt-10',
  );

  const email = (
    <>
      {/* Email header */}
      <div className="flex min-h-[77px] flex-col justify-center gap-1 rounded-t-sm border-b border-gray-200 bg-white px-6 text-gray-700">
        {emailHeader}
      </div>

      {/* Email content */}
      <div className={isPhone ? 'grow' : 'overflow-y-auto'} style={{ backgroundColor }}>
        {cardBackgroundColor ? (
          // Card look: the background colour is the page; header, body and footer sit together
          // in one 600px card. On desktop the page shows as an even gap all around the card;
          // on phones the card fills the screen.
          // The gap is padding on all four sides, so it stays even even when a scrollbar narrows
          // the window: the card gives up the width instead.
          <div style={{ padding: isPhone ? 0 : CARD_PAGE_BAND_PX }}>
            <div
              className="mx-auto max-w-[600px] overflow-hidden"
              style={{ backgroundColor: cardBackgroundColor, borderRadius: cardRadius }}
            >
              {headerImage && (
                // Fills the top of the card edge to edge; the card's corners clip it.
                <img alt="" className="block w-full" src={headerImage} />
              )}
              <div style={{ ...headerBand, ...headerStyle }}>{headerContent}</div>
              <div className={bodyClassName} style={columnStyle}>
                {bodyContent}
              </div>
            </div>
          </div>
        ) : (
          <>
            <div style={headerBand}>
              <div className="mx-auto max-w-[600px]" style={headerStyle}>
                {headerContent}
              </div>
            </div>

            <div className={bodyClassName} style={columnStyle}>
              {bodyContent}
            </div>
          </>
        )}
      </div>
    </>
  );

  return (
    <div className="relative flex grow flex-col">
      <div className="absolute inset-0 m-5 flex items-center justify-center">
        {isPhone ? (
          <PreviewChrome
            className="max-h-full"
            device="mobile"
            {...{ [PREVIEW_CAPTURE_ATTRIBUTE]: '' }}
          >
            <div className="flex min-h-full flex-col text-black" style={{ backgroundColor }}>
              {email}
            </div>
          </PreviewChrome>
        ) : (
          <div
            className="mx-auto my-0 flex max-h-full w-full max-w-[700px] flex-col overflow-hidden rounded-[4px] text-black shadow-sm"
            {...{ [PREVIEW_CAPTURE_ATTRIBUTE]: '' }}
          >
            {email}
          </div>
        )}
      </div>
    </div>
  );
};

export default NewsletterPreviewContent;
