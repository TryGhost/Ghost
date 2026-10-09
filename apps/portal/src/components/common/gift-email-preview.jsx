import { useEffect, useState } from 'react';
import Interpolate from '@doist/react-interpolate';
import CheckmarkIcon from '../../images/icons/checkmark.svg?react';
import QuoteIcon from '../../images/icons/quote.svg?react';
import { getDateString, parseDateValue } from '../../utils/date-time';
import { getGiftIntroduction } from '../../utils/gift-redemption-notification';
import { t } from '../../utils/i18n';
import { giftRevealClass, giftRevealInnerClass } from '../pages/gift/classes';
import { tw } from '../../utils/tw';

const DATE_CLASSES = tw`[transform:translateY(2px)] text-12.5 leading-[1.2] font-normal whitespace-nowrap text-white/75 opacity-0 [grid-area:1/1] [transition:opacity_180ms_var(--ease-out-quart),transform_180ms_var(--ease-out-quart)] data-[active=true]:[transform:none] data-[active=true]:opacity-100 motion-reduce:[transition:none]`;

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
    <div className="w-full">
      <div className="relative flex w-full flex-col gap-2.5">
        {/* Mail-client chrome: who the message is addressed to, and when
                    it goes out. Kept outside the email body proper, like the
                    header of an opened message. */}
        <div className="flex items-end gap-3 px-2.5 pt-0.5 pb-1.5">
          <div className="flex min-h-[43px] min-w-0 flex-1 flex-col justify-end gap-0.5">
            {/* The email really is sent by the publication, so
                            that's the sender; the buyer is named in the body. */}
            <div className="flex animate-gift-email-fade items-center gap-[5px] truncate text-13 leading-[1.2] font-semibold text-white motion-reduce:animate-none">
              {siteTitle}
            </div>
            {/* Absent until there's a recipient, rather than sitting
                            there as a placeholder. The block beside it already
                            reserves both lines, so this opening lifts the
                            publisher rather than pushing the message down. */}
            <div
              aria-hidden={!recipientLabel}
              className={giftRevealClass}
              data-open={!!recipientLabel}
            >
              <div className={giftRevealInnerClass}>
                <div className="flex animate-gift-email-fade items-center gap-[5px] truncate pt-0.5 text-12.5 leading-[1.2] font-normal text-white/75 motion-reduce:animate-none">
                  <span className="shrink-0 font-normal text-white/55">{t('To')}:</span>
                  <span className="min-w-0 truncate">{recipientLabel}</span>
                </div>
              </div>
            </div>
          </div>
          <div className="grid shrink-0 justify-items-end pl-3">
            <div aria-hidden={isScheduled} className={DATE_CLASSES} data-active={!isScheduled}>
              {todayDate}
            </div>
            <div aria-hidden={!isScheduled} className={DATE_CLASSES} data-active={isScheduled}>
              {scheduledLabel}
            </div>
          </div>
        </div>

        <div className="relative z-[1] rounded-[16px] bg-white px-10 pt-9 pb-10 [box-shadow:0_16px_40px_rgb(0_0_0/0.1),0_3px_8px_rgb(0_0_0/0.06)]">
          {/* The template leads with the publication's icon, falling
                        back to its name, above the subject. */}
          <div className="mb-5.5 flex justify-start">
            {siteIcon ? (
              <img alt={siteTitle} className="size-12 rounded-[4px] object-cover" src={siteIcon} />
            ) : (
              <span className="text-17 font-bold text-brand">{siteTitle}</span>
            )}
          </div>

          <h1 className="mb-3.5 text-start text-25 leading-[1.2] font-bold tracking-[-0.01em] text-[#15212a]">
            {t('A gift, just for you')}
          </h1>

          <div aria-hidden={!toName} className={giftRevealClass} data-open={!!toName}>
            <div className={giftRevealInnerClass}>
              <p className="mb-0 pb-2.5 text-15.5 leading-[1.5] text-[#3a464c]">
                {t('Hi {recipientName},', { recipientName: toName })}
              </p>
            </div>
          </div>

          <p className="gh-portal-gift-email-lede mb-0 text-15.5 leading-[1.5] text-[#3a464c] [&_strong]:[font-weight:inherit] [&_strong]:[color:inherit]">
            <Interpolate mapping={giftDetails} string={lede} />
          </p>

          <div aria-hidden={!message} className={giftRevealClass} data-open={!!message}>
            <div className={giftRevealInnerClass}>
              <blockquote className="relative mx-0 mt-6 mb-0 overflow-hidden rounded-[8px] bg-[color:color-mix(in_srgb,var(--brandcolor)_7%,var(--color-white))] px-4.5 py-4">
                {/* Drawn rather than typed: the quote glyphs in
                                    the system stack are squared off, and this
                                    wants the round, stylised mark. One mark, no
                                    closing pair, set behind the text so it reads
                                    as part of the panel the note sits on. */}
                <QuoteIcon
                  aria-hidden="true"
                  className="pointer-events-none absolute -start-2.5 -top-5.5 h-auto w-[98px] text-brand opacity-[0.04]"
                  focusable="false"
                />
                <p className="relative mb-0 text-15.5 leading-[1.5] [word-break:break-word] whitespace-pre-line text-[#15212a] italic">
                  {message}
                </p>
                {/* No dash before the name — the note above it
                                    leaves no doubt whose it is. */}
                {fromName && (
                  <p className="relative mt-2.5 mb-0 text-13.5 leading-[1.4] text-[color:color-mix(in_srgb,var(--brandcolor)_72%,#15212A)]">
                    {fromName}
                  </p>
                )}
              </blockquote>
            </div>
          </div>

          {benefits.length > 0 && (
            <div className="mt-6">
              <p className="mb-1.5 text-15.5 leading-[1.45] font-normal text-[#3a464c]">
                {t("What's included")}
              </p>
              {/* Every perk, as the email sends them. */}
              <div>
                {benefits.map((benefit, idx) => (
                  <div
                    key={benefit?.id || `benefit-${idx}`}
                    className="flex items-start gap-2.5 py-[5px] text-15.5 leading-[1.45] text-[#3a464c]"
                  >
                    <CheckmarkIcon
                      aria-hidden="true"
                      className="mt-1 size-[13px] shrink-0 [&_path]:stroke-brand"
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
