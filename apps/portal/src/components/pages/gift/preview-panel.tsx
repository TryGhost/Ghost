import type { HTMLAttributes, RefObject } from 'react';
import GiftCard from '../../common/gift-card';
import GiftEmailPreview from '../../common/gift-email-preview';
import { getGiftDurationLabel } from '../../../utils/gift-redemption-notification';
import type { GiftCadenceDuration, GiftDuration, GiftProduct } from './types';

interface TypedGiftCardProps {
  cardRef: RefObject<HTMLDivElement>;
  duration: string;
  fromName: string;
  giftValue: string;
  siteIcon: string | undefined;
  siteTitle: string;
  tierName: string;
}

type TypedGiftEmailPreviewProps = GiftCadenceDuration & {
  benefits: NonNullable<GiftProduct['benefits']>;
  buyerName: string;
  deliveryDate: string;
  giftMessage: string;
  isScheduled: boolean;
  recipientEmail: string;
  recipientName: string;
  siteIcon: string | undefined;
  siteTitle: string;
  tierName: string;
};

const TypedGiftCard = GiftCard as unknown as (props: TypedGiftCardProps) => JSX.Element;
const TypedGiftEmailPreview = GiftEmailPreview as unknown as (
  props: TypedGiftEmailPreviewProps,
) => JSX.Element;

interface GiftPreviewPanelProps {
  activeDuration: GiftDuration;
  activeProduct: GiftProduct;
  buyerName: string;
  cardRef: RefObject<HTMLDivElement>;
  cardTiltProps: HTMLAttributes<HTMLDivElement>;
  effectiveDeliveryDate: string;
  emailDuration: GiftCadenceDuration;
  giftMessage: string;
  giftValue: string;
  minDeliveryDate: string;
  recipientEmail: string;
  recipientName: string;
  showEmailPreview: boolean;
  siteIcon: string | undefined;
  siteTitle: string;
}

function GiftPreviewPanel({
  activeDuration,
  activeProduct,
  buyerName,
  cardRef,
  cardTiltProps,
  effectiveDeliveryDate,
  emailDuration,
  giftMessage,
  giftValue,
  minDeliveryDate,
  recipientEmail,
  recipientName,
  showEmailPreview,
  siteIcon,
  siteTitle,
}: GiftPreviewPanelProps) {
  return (
    <div className="gh-portal-gift-checkout-right" {...cardTiltProps}>
      <div className="gh-portal-gift-checkout-right-panel">
        {/* Both representations stay mounted and share a single grid cell, so switching between
        them cross-dissolves instead of unmounting one and popping the other in. */}
        <div className="gh-portal-gift-checkout-stage">
          <div
            aria-hidden={showEmailPreview}
            className="gh-portal-gift-checkout-stage-item card"
            data-active={!showEmailPreview}
          >
            <div className="gh-portal-gift-checkout-card-stack">
              <TypedGiftCard
                cardRef={cardRef}
                duration={getGiftDurationLabel({
                  cadence: 'month',
                  duration: activeDuration,
                })}
                fromName={buyerName.trim()}
                giftValue={giftValue}
                siteIcon={siteIcon}
                siteTitle={siteTitle}
                tierName={activeProduct.name}
              />
            </div>
          </div>
          <div
            aria-hidden={!showEmailPreview}
            className="gh-portal-gift-checkout-stage-item email"
            data-active={showEmailPreview}
          >
            <div className="gh-portal-gift-checkout-email-stack">
              <TypedGiftEmailPreview
                {...emailDuration}
                benefits={activeProduct.benefits || []}
                buyerName={buyerName}
                deliveryDate={effectiveDeliveryDate}
                giftMessage={giftMessage}
                isScheduled={effectiveDeliveryDate > minDeliveryDate}
                recipientEmail={recipientEmail}
                recipientName={recipientName}
                siteIcon={siteIcon}
                siteTitle={siteTitle}
                tierName={activeProduct.name}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default GiftPreviewPanel;
