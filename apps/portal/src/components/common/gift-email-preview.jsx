import { useEffect, useState } from 'react';
import Interpolate from '@doist/react-interpolate';
import CheckmarkIcon from '../../images/icons/checkmark.svg?react';
import QuoteIcon from '../../images/icons/quote.svg?react';
import { getDateString, parseDateValue } from '../../utils/date-time';
import { getGiftIntroduction } from '../../utils/gift-redemption-notification';
import { t } from '../../utils/i18n';
import { giftRevealClasses, giftRevealInnerClasses } from '../shared-classes';
import { tw } from '../../utils/tw';

const DATE_CLASSES = tw`gh-portal-gift-email-date whitespace-nowrap text-[1.25rem] font-normal leading-[1.2] text-white/75 opacity-0 [grid-area:1/1] [transform:translateY(2px)] [transition:opacity_180ms_cubic-bezier(0.25,1,0.5,1),transform_180ms_cubic-bezier(0.25,1,0.5,1)] data-[active=true]:opacity-100 data-[active=true]:[transform:none] motion-reduce:[transition:none]`;

// A live preview of the delivery email, shown in place of the gift card while
// the buyer is on the "Email it to them" tab. It reproduces the real template
// (services/gifts/email-templates/gift-delivery.hbs) rather than abstracting
// it — same order, same palette, same accent-coloured redeem button — so what
// the buyer watches fill in is what the recipient actually opens.

const GiftEmailPreview = ({
  recipientName,
  recipientEmail,
  buyerName,
  giftMessage,
  // The effective delivery date, always set — isScheduled says whether it
  // is a future pick or just "today".
  deliveryDate,
  isScheduled = false,
  cadence,
  duration,
  tierName,
  benefits = [],
  siteTitle,
  siteIcon,
}) => {
  const toName = recipientName.trim();
  const toEmail = recipientEmail.trim();
  const fromName = buyerName.trim();
  const message = giftMessage.trim();

  const todayDate = getDateString(new Date());
  const scheduledDate = getDateString(parseDateValue(deliveryDate)) || todayDate;
  // The last future date is kept so the scheduled label stays legible while
  // its side of the date stack cross-fades out after switching back to
  // "now" — otherwise it would hard-swap to today's date mid-fade.
  const [lastScheduledDate, setLastScheduledDate] = useState('');
  useEffect(() => {
    if (isScheduled) {
      setLastScheduledDate(scheduledDate);
    }
  }, [isScheduled, scheduledDate]);
  const scheduledLabel = isScheduled ? scheduledDate : lastScheduledDate || todayDate;

  // "Name <address>" is how a mail client identifies a recipient; fall back to
  // whichever half the buyer has filled in so far.
  let recipientLabel = '';
  if (toName && toEmail) {
    recipientLabel = `${toName} <${toEmail}>`;
  } else {
    recipientLabel = toEmail || toName;
  }

  const giftDetails = {
    buyerName: <strong>{fromName}</strong>,
    duration,
    strong: <strong />,
    tierName: <strong>{tierName}</strong>,
    siteTitle,
  };
  const lede = getGiftIntroduction({ buyerName: fromName, cadence, duration, siteTitle });

  return (
    <div className="gh-portal-gift-email w-full">
      <div className="gh-portal-gift-email-sheet relative flex w-full flex-col gap-[10px]">
        {/* Mail-client chrome: who the message is addressed to, and when
                    it goes out. Kept outside the email body proper, like the
                    header of an opened message. */}
        <div className="gh-portal-gift-email-meta flex items-end gap-[12px] px-[10px] pb-[6px] pt-[2px]">
          <div className="gh-portal-gift-email-meta-text flex min-h-[43px] min-w-0 flex-1 flex-col justify-end gap-[2px]">
            {/* The email really is sent by the publication, so
                            that's the sender; the buyer is named in the body. */}
            <div className="gh-portal-gift-email-from flex animate-[gh-portal-gift-email-fade_200ms_cubic-bezier(0.25,1,0.5,1)_both] items-center gap-[5px] truncate text-sm font-semibold leading-[1.2] text-white motion-reduce:animate-none">
              {siteTitle}
            </div>
            {/* Absent until there's a recipient, rather than sitting
                            there as a placeholder. The block beside it already
                            reserves both lines, so this opening lifts the
                            publisher rather than pushing the message down. */}
            <div
              aria-hidden={!recipientLabel}
              className={giftRevealClasses}
              data-open={!!recipientLabel}
            >
              <div className={giftRevealInnerClasses}>
                <div className="gh-portal-gift-email-to flex animate-[gh-portal-gift-email-fade_200ms_cubic-bezier(0.25,1,0.5,1)_both] items-center gap-[5px] truncate pt-[2px] text-[1.25rem] font-normal leading-[1.2] text-white/75 motion-reduce:animate-none">
                  <span className="gh-portal-gift-email-meta-label shrink-0 font-normal text-white/55">
                    {t('To')}:
                  </span>
                  <span className="gh-portal-gift-email-to-value min-w-0 truncate">
                    {recipientLabel}
                  </span>
                </div>
              </div>
            </div>
          </div>
          <div className="gh-portal-gift-email-date-stack grid shrink-0 justify-items-end pl-[12px]">
            <div aria-hidden={isScheduled} className={DATE_CLASSES} data-active={!isScheduled}>
              {todayDate}
            </div>
            <div aria-hidden={!isScheduled} className={DATE_CLASSES} data-active={isScheduled}>
              {scheduledLabel}
            </div>
          </div>
        </div>

        <div className="gh-portal-gift-email-body relative z-[1] rounded-[16px] bg-white px-[40px] pb-[40px] pt-[36px] [box-shadow:0_16px_40px_rgba(var(--blackrgb),0.1),0_3px_8px_rgba(var(--blackrgb),0.06)]">
          {/* The template leads with the publication's icon, falling
                        back to its name, above the subject. */}
          <div className="gh-portal-gift-email-lockup mb-[22px] flex justify-start">
            {siteIcon ? (
              <img
                alt={siteTitle}
                className="gh-portal-gift-email-lockup-icon size-[48px] rounded-[4px] object-cover"
                src={siteIcon}
              />
            ) : (
              <span className="gh-portal-gift-email-lockup-title text-[1.7rem] font-bold text-brand">
                {siteTitle}
              </span>
            )}
          </div>

          <h1 className="gh-portal-gift-email-subject mb-[14px] text-start text-[2.5rem] font-bold leading-[1.2] tracking-[-0.01em] text-gray-950">
            {t('A gift, just for you')}
          </h1>

          <div aria-hidden={!toName} className={giftRevealClasses} data-open={!!toName}>
            <div className={giftRevealInnerClasses}>
              <p className="gh-portal-gift-email-greeting mb-0 pb-[10px] text-[1.55rem] leading-[1.5] text-gray-900">
                {t('Hi {recipientName},', { recipientName: toName })}
              </p>
            </div>
          </div>

          <p className="gh-portal-gift-email-lede mb-0 text-[1.55rem] leading-[1.5] text-gray-900 [&_strong]:[color:inherit] [&_strong]:[font-weight:inherit]">
            <Interpolate mapping={giftDetails} string={lede} />
          </p>

          <div aria-hidden={!message} className={giftRevealClasses} data-open={!!message}>
            <div className={giftRevealInnerClasses}>
              <blockquote className="gh-portal-gift-email-message relative mx-0 mb-0 mt-[24px] overflow-hidden rounded-[8px] bg-[color:color-mix(in_srgb,var(--brandcolor)_7%,theme(colors.white))] px-[18px] py-[16px]">
                {/* Drawn rather than typed: the quote glyphs in
                                    the system stack are squared off, and this
                                    wants the round, stylised mark. One mark, no
                                    closing pair, set behind the text so it reads
                                    as part of the panel the note sits on. */}
                <QuoteIcon
                  aria-hidden="true"
                  className="gh-portal-gift-email-message-mark pointer-events-none absolute start-[-10px] top-[-22px] h-auto w-[98px] text-brand opacity-[0.04]"
                  focusable="false"
                />
                <p className="gh-portal-gift-email-message-text relative mb-0 whitespace-pre-line text-[1.55rem] italic leading-[1.5] text-gray-950 [word-break:break-word]">
                  {message}
                </p>
                {/* No dash before the name — the note above it
                                    leaves no doubt whose it is. */}
                {fromName && (
                  <p className="gh-portal-gift-email-message-from relative mb-0 mt-[10px] text-[1.35rem] leading-[1.4] text-[color:color-mix(in_srgb,var(--brandcolor)_72%,#15212A)]">
                    {fromName}
                  </p>
                )}
              </blockquote>
            </div>
          </div>

          {benefits.length > 0 && (
            <div className="gh-portal-gift-email-benefits mt-[24px]">
              <p className="gh-portal-gift-email-benefits-label mb-[6px] text-[1.55rem] font-normal leading-[1.45] text-gray-900">
                {t("What's included")}
              </p>
              {/* Every perk, as the email sends them. */}
              <div>
                {benefits.map((benefit, idx) => (
                  <div
                    key={benefit?.id || `benefit-${idx}`}
                    className="gh-portal-gift-email-benefit flex items-start gap-[10px] py-[5px] text-[1.55rem] leading-[1.45] text-gray-900"
                  >
                    <CheckmarkIcon
                      aria-hidden="true"
                      className="mt-[4px] size-[13px] shrink-0 [&_path]:stroke-brand"
                      focusable="false"
                    />
                    <span>{benefit.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* The email closes with a redeem button, an expiry line
                        and a sent-from footer. All three are left out here:
                        they're the recipient's business, not the buyer's, and
                        they pushed the parts actually being composed off the
                        panel. */}
        </div>
      </div>
    </div>
  );
};

export default GiftEmailPreview;
