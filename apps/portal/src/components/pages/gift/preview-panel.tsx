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
    <div
      className="gh-portal-gift-checkout-right top-0 flex h-screen overflow-y-auto py-3 pl-0 pr-3 [align-self:start] [position:sticky] max-[880px]:static max-[880px]:-order-1 max-[880px]:hidden max-[880px]:h-auto max-[880px]:overflow-visible max-[880px]:p-0"
      {...cardTiltProps}
    >
      <div className="gh-portal-gift-checkout-right-panel flex min-h-0 flex-1 flex-col items-center overflow-y-auto rounded-[32px] px-12 py-16 [background:linear-gradient(180deg,rgba(0,0,0,0.3)_0%,rgba(0,0,0,0)_100%),var(--brandcolor)] max-[880px]:rounded-t-none max-[880px]:px-6 max-[880px]:pb-8 max-[880px]:pt-14">
        {/* Both representations stay mounted and share a single grid cell, so switching between
        them cross-dissolves instead of unmounting one and popping the other in. */}
        <div className="gh-portal-gift-checkout-stage my-auto grid w-full shrink-0">
          <div
            aria-hidden={showEmailPreview}
            className="gh-portal-gift-checkout-stage-item card pointer-events-none invisible flex items-center justify-center opacity-0 [filter:blur(2px)] [grid-area:1/1] [transform:scale(0.92)_translateY(-10px)] [transition:opacity_260ms_cubic-bezier(0.25,1,0.5,1),transform_260ms_cubic-bezier(0.25,1,0.5,1),filter_260ms_cubic-bezier(0.25,1,0.5,1),visibility_260ms] data-[active=true]:pointer-events-auto data-[active=true]:visible data-[active=true]:opacity-100 data-[active=true]:[filter:none] data-[active=true]:[transform:none] motion-reduce:[transition:none]"
            data-active={!showEmailPreview}
          >
            <div className="gh-portal-gift-checkout-card-stack my-auto flex w-full max-w-[280px] shrink-0 flex-col items-center max-[880px]:max-w-[240px]">
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
            className="gh-portal-gift-checkout-stage-item email pointer-events-none invisible flex items-center justify-center opacity-0 [filter:blur(2px)] [grid-area:1/1] [transform:scale(0.96)_translateY(12px)] [transition:opacity_260ms_cubic-bezier(0.25,1,0.5,1),transform_260ms_cubic-bezier(0.25,1,0.5,1),filter_260ms_cubic-bezier(0.25,1,0.5,1),visibility_260ms] data-[active=true]:pointer-events-auto data-[active=true]:visible data-[active=true]:opacity-100 data-[active=true]:[filter:none] data-[active=true]:[transform:none] motion-reduce:[transition:none]"
            data-active={showEmailPreview}
          >
            <div className="gh-portal-gift-checkout-email-stack flex w-full max-w-[min(480px,100%-32px)] shrink-0 flex-col items-center [zoom:0.9] max-[880px]:max-w-[min(400px,100%-32px)]">
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
