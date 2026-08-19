import Interpolate from '@doist/react-interpolate';
import CheckmarkIcon from '../../images/icons/checkmark.svg?react';
import QuoteIcon from '../../images/icons/quote.svg?react';
import {getDateString} from '../../utils/date-time';
import {getGiftIntroduction} from '../../utils/gift-redemption-notification';
import {t} from '../../utils/i18n';

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
    cadence,
    duration,
    tierName,
    benefits = [],
    siteTitle,
    siteIcon
}) => {
    const toName = recipientName.trim();
    const toEmail = recipientEmail.trim();
    const fromName = buyerName.trim();
    const message = giftMessage.trim();

    const todayDate = getDateString(new Date());

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
        duration: <strong>{duration}</strong>,
        tierName: <strong>{tierName}</strong>,
        siteTitle
    };
    const lede = getGiftIntroduction({buyerName: fromName, cadence, duration, siteTitle});

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
                        <div className='gh-portal-gift-email-from'>{siteTitle}</div>
                        {/* Absent until there's a recipient, rather than sitting
                            there as a placeholder. The block beside it already
                            reserves both lines, so this opening lifts the
                            publisher rather than pushing the message down. */}
                        <div aria-hidden={!recipientLabel} className='gh-portal-gift-checkout-reveal' data-open={!!recipientLabel}>
                            <div className='gh-portal-gift-checkout-reveal-inner'>
                                <div className='gh-portal-gift-email-to'>
                                    <span className='gh-portal-gift-email-meta-label'>{t('To')}:</span>
                                    <span className='gh-portal-gift-email-to-value'>{recipientLabel}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className='gh-portal-gift-email-date'>{todayDate}</div>
                </div>

                <div className='gh-portal-gift-email-body'>
                    {/* The template leads with the publication's icon, falling
                        back to its name, above the subject. */}
                    <div className='gh-portal-gift-email-lockup'>
                        {siteIcon
                            ? <img alt={siteTitle} className='gh-portal-gift-email-lockup-icon' src={siteIcon} />
                            : <span className='gh-portal-gift-email-lockup-title'>{siteTitle}</span>}
                    </div>

                    <h1 className='gh-portal-gift-email-subject'>{t('A gift, just for you')}</h1>

                    <div aria-hidden={!toName} className='gh-portal-gift-checkout-reveal' data-open={!!toName}>
                        <div className='gh-portal-gift-checkout-reveal-inner'>
                            <p className='gh-portal-gift-email-greeting'>{t('Hi {recipientName},', {recipientName: toName})}</p>
                        </div>
                    </div>

                    <p className='gh-portal-gift-email-lede'>
                        <Interpolate mapping={giftDetails} string={lede} />
                    </p>

                    <div aria-hidden={!message} className='gh-portal-gift-checkout-reveal' data-open={!!message}>
                        <div className='gh-portal-gift-checkout-reveal-inner'>
                            <blockquote className='gh-portal-gift-email-message'>
                                {/* Drawn rather than typed: the quote glyphs in
                                    the system stack are squared off, and this
                                    wants the round, stylised mark. One mark, no
                                    closing pair, set behind the text so it reads
                                    as part of the panel the note sits on. */}
                                <QuoteIcon aria-hidden='true' className='gh-portal-gift-email-message-mark' focusable='false' />
                                <p className='gh-portal-gift-email-message-text'>{message}</p>
                                {/* No dash before the name — the note above it
                                    leaves no doubt whose it is. */}
                                {fromName && (
                                    <p className='gh-portal-gift-email-message-from'>{fromName}</p>
                                )}
                            </blockquote>
                        </div>
                    </div>

                    {benefits.length > 0 && (
                        <div className='gh-portal-gift-email-benefits'>
                            <p className='gh-portal-gift-email-benefits-label'>{t('What\'s included')}</p>
                            {/* Every perk, as the email sends them. */}
                            <div>
                                {benefits.map((benefit, idx) => (
                                    <div key={benefit?.id || `benefit-${idx}`} className='gh-portal-gift-email-benefit'>
                                        <CheckmarkIcon aria-hidden='true' focusable='false' />
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
