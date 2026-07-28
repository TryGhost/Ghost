import {useRef} from 'react';
import Interpolate from '@doist/react-interpolate';
import CheckmarkIcon from '../../images/icons/checkmark.svg?react';
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

const Skeleton = ({width}) => (
    <span aria-hidden='true' className='gh-portal-gift-email-skeleton' style={{width}} />
);

const GiftEmailPreview = ({
    recipientName,
    recipientEmail,
    buyerName,
    giftMessage,
    deliveryOption,
    deliveryDate,
    durationLabel,
    tierName,
    benefits = [],
    siteTitle,
    siteIcon
}) => {
    const toName = recipientName.trim();
    const toEmail = recipientEmail.trim();
    const fromName = buyerName.trim();
    const message = giftMessage.trim();

    const isScheduled = deliveryOption === 'schedule' && !!deliveryDate;
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

    // The parent clears the date the moment "Right away" is picked, which would
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
                    {/* A lettered avatar rather than the site icon — the icon
                        already leads the email body just below. */}
                    <div aria-hidden='true' className='gh-portal-gift-email-avatar'>
                        {(siteTitle || '').charAt(0).toUpperCase()}
                    </div>
                    <div className='gh-portal-gift-email-meta-text'>
                        <div className='gh-portal-gift-email-from-row'>
                            {/* The email really is sent by the publication, so
                                that's the sender; the buyer is named in the body. */}
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
                        <div key={recipientLabel ? 'to' : 'to-empty'} className='gh-portal-gift-email-to'>
                            <span className='gh-portal-gift-email-meta-label'>{t('To')}:</span>
                            {recipientLabel || <Skeleton width='150px' />}
                        </div>
                    </div>
                </div>

                <div className='gh-portal-gift-email-body'>
                    <div className='gh-portal-gift-email-brand'>
                        {siteIcon
                            ? <img alt='' className='gh-portal-gift-email-brand-icon' src={siteIcon} />
                            : <span className='gh-portal-gift-email-brand-name'>{siteTitle}</span>}
                    </div>

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
                                {fromName && <p className='gh-portal-gift-email-message-from'>&mdash; {fromName}</p>}
                            </blockquote>
                        </div>
                    </div>

                    {benefits.length > 0 && (
                        <div className='gh-portal-gift-email-benefits'>
                            <div className='gh-portal-gift-email-benefits-label'>{t('What\'s included')}</div>
                            {benefits.map((benefit, idx) => (
                                <div key={benefit?.id || `benefit-${idx}`} className='gh-portal-gift-email-benefit'>
                                    <CheckmarkIcon aria-hidden='true' focusable='false' />
                                    <span>{benefit.name}</span>
                                </div>
                            ))}
                        </div>
                    )}

                    <div aria-hidden='true' className='gh-portal-gift-email-cta'>{t('Redeem your gift')}</div>
                </div>
            </div>
        </div>
    );
};

export default GiftEmailPreview;
