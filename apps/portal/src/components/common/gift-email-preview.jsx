import {useRef} from 'react';
import Interpolate from '@doist/react-interpolate';
import CheckmarkIcon from '../../images/icons/checkmark.svg?react';
import GiftCard from './gift-card';
import {getDateString} from '../../utils/date-time';
import {t} from '../../utils/i18n';

// A live preview of the delivery email, shown in place of the gift card while
// the buyer is on the "Email it to them" tab. It reproduces the real template
// (services/gifts/email-templates/gift-delivery.hbs) rather than abstracting
// it — same order, same palette, same accent-coloured redeem button — so what
// the buyer watches fill in is what the recipient actually opens.

// Formatting goes through Portal's shared getDateString ("27 Jul 2027"), the
// same as the account area. 'YYYY-MM-DD' from the date input is parsed
// component-wise first: handing the raw string to `new Date()` would read it as
// UTC midnight and render the previous day west of UTC.
const formatDeliveryDate = (value) => {
    const [year, month, day] = value.split('-').map(Number);
    if (!year || !month || !day) {
        return '';
    }
    return getDateString(new Date(year, month - 1, day));
};

// Perks shown in full before the list fades out. Kept in step with the
// max-height on .gh-portal-gift-email-benefits-list, which is measured from the
// row metrics rather than counted.
const VISIBLE_BENEFITS = 3;

const GiftEmailPreview = ({
    recipientName,
    recipientEmail,
    buyerName,
    giftMessage,
    deliveryDate,
    durationLabel,
    cardDurationLabel,
    tierName,
    benefits = [],
    siteTitle,
    siteIcon
}) => {
    const toName = recipientName.trim();
    const toEmail = recipientEmail.trim();
    const fromName = buyerName.trim();
    const message = giftMessage.trim();

    // The page only passes a date when it's after today — today means "send
    // it now", which this preview words as landing today.
    const isScheduled = !!deliveryDate;
    const scheduledDate = isScheduled ? formatDeliveryDate(deliveryDate) : '';
    // Sending now means it lands today, so that's the date the message carries.
    const todayDate = getDateString(new Date());

    // "Name <address>" is how a mail client identifies a recipient; fall back to
    // whichever half the buyer has filled in so far.
    let recipientLabel = '';
    if (toName && toEmail) {
        recipientLabel = `${toName} <${toEmail}>`;
    } else {
        recipientLabel = toEmail || toName;
    }

    // The parent clears the date the moment "Send it now" is picked, which would
    // blank this mid-swap. Hold the last one so it can animate out.
    const lastScheduledDate = useRef('');
    const scheduledLabel = isScheduled ? scheduledDate : lastScheduledDate.current;
    lastScheduledDate.current = scheduledLabel;


    // Bold the buyer + "{duration} {tier}" exactly as the delivery email and
    // the redemption page do, reusing their strings rather than new ones.
    const emphasis = {strong: <strong />};
    const lede = fromName
        ? t('<strong>{buyerName}</strong> has gifted you a <strong>{duration} {tierName}</strong> membership to {siteTitle}', {buyerName: fromName, duration: durationLabel, tierName, siteTitle})
        : t('You\'ve been gifted a <strong>{duration} {tierName}</strong> membership to {siteTitle}', {duration: durationLabel, tierName, siteTitle});

    return (
        <div className='gh-portal-gift-email'>
            <div className='gh-portal-gift-email-sheet'>
                {/* Mail-client chrome: who the message is addressed to, and when
                    it goes out. Kept outside the email body proper, like the
                    header of an opened message. */}
                <div className='gh-portal-gift-email-meta'>
                    <div className='gh-portal-gift-email-meta-text'>
                        {/* The email really is sent by the publication, so
                            that's the sender; the buyer is named in the body. */}
                        {/* Publisher and date always share the top line. */}
                        <div className='gh-portal-gift-email-from-row'>
                            <div className='gh-portal-gift-email-from'>{siteTitle}</div>
                            <div className='gh-portal-gift-email-date-stack'>
                                <div aria-hidden={isScheduled} className='gh-portal-gift-email-date' data-active={!isScheduled}>
                                    {todayDate}
                                </div>
                                <div aria-hidden={!isScheduled} className='gh-portal-gift-email-date' data-active={isScheduled}>
                                    {scheduledLabel}
                                </div>
                            </div>
                        </div>
                        {/* Absent until there's a recipient, rather than sitting
                            there as a placeholder. The preview is centred in the
                            panel, so the block growing a second line lifts the
                            publisher row to its final position as it opens. */}
                        <div aria-hidden={!recipientLabel} className='gh-portal-gift-checkout-reveal' data-open={!!recipientLabel}>
                            <div className='gh-portal-gift-checkout-reveal-inner'>
                                <div className='gh-portal-gift-email-to'>
                                    <span className='gh-portal-gift-email-meta-label'>{t('To')}:</span>
                                    <span className='gh-portal-gift-email-to-value'>{recipientLabel}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className='gh-portal-gift-email-body'>
                    {/* The real template leads with the publication's icon or
                        name; the preview drops it. The addressing line above
                        already names the sender, and the card alongside carries
                        the lockup, so repeating it here was the third mention. */}
                    <h1 className='gh-portal-gift-email-subject'>{t('A gift, just for you')}</h1>

                    <div aria-hidden={!toName} className='gh-portal-gift-checkout-reveal' data-open={!!toName}>
                        <div className='gh-portal-gift-checkout-reveal-inner'>
                            <p className='gh-portal-gift-email-greeting'>{t('Hi {recipientName},', {recipientName: toName})}</p>
                        </div>
                    </div>

                    <p className='gh-portal-gift-email-lede'>
                        <Interpolate mapping={emphasis} string={lede} />
                    </p>

                    <div aria-hidden={!message} className='gh-portal-gift-checkout-reveal' data-open={!!message}>
                        <div className='gh-portal-gift-checkout-reveal-inner'>
                            <blockquote className='gh-portal-gift-email-message'>
                                <p className='gh-portal-gift-email-message-text'>&ldquo;{message}&rdquo;</p>
                            </blockquote>
                        </div>
                    </div>

                    {benefits.length > 0 && (
                        <div className='gh-portal-gift-email-benefits'>
                            {/* Capped at three visible perks, with the rest fading
                                out — a tier with a long list would otherwise push
                                the sheet far taller than the card beside it. The
                                flag drives the cap rather than a bare max-height,
                                so three or fewer render at full opacity with no
                                fade hanging off the last row. */}
                            <div className='gh-portal-gift-email-benefits-list' data-truncated={benefits.length > VISIBLE_BENEFITS}>
                                {benefits.map((benefit, idx) => (
                                    <div key={benefit?.id || `benefit-${idx}`} className='gh-portal-gift-email-benefit'>
                                        <CheckmarkIcon aria-hidden='true' focusable='false' />
                                        <span>{benefit.name}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <div aria-hidden='true' className='gh-portal-gift-email-cta'>{t('Redeem your gift')}</div>
                </div>

                {/* The same card the buyer configured on step 1, laid over the
                    sheet's bottom-right corner so the two read as a stack.
                    Decorative here — the sheet already states everything on it —
                    so it's hidden from assistive tech. No cardRef is passed, so
                    useCardTilt never binds to it and it stays completely still.

                    Sender and value are deliberately left off: at this size they
                    are the card's smallest type, and the sheet behind already
                    names the buyer in its opening line. The card keeps what only
                    it says — the duration, the tier and the publication. */}
                <div aria-hidden='true' className='gh-portal-gift-email-card'>
                    <GiftCard
                        duration={cardDurationLabel}
                        siteIcon={siteIcon}
                        siteTitle={siteTitle}
                        tierName={tierName}
                    />
                </div>
            </div>
        </div>
    );
};

export default GiftEmailPreview;
