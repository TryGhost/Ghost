import type { HTMLAttributes, RefObject } from 'react';
import GiftCard from '../../common/gift-card';
import GiftEmailPreview from '../../common/gift-email-preview';
import { getGiftDurationLabel } from '../../../utils/gift-redemption-notification';
import type { GiftCadenceDuration, GiftDuration, GiftProduct } from './types';
import { giftCheckoutRightClasses } from '../../shared-classes';

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
    <div className={`${giftCheckoutRightClasses} max-md:hidden`} {...cardTiltProps}>
      <div className="flex min-h-0 flex-1 flex-col items-center overflow-y-auto rounded-[32px] px-12 py-16 [background:linear-gradient(180deg,rgba(0,0,0,0.3)_0%,rgba(0,0,0,0)_100%),var(--brandcolor)] max-md:rounded-t-none max-md:px-6 max-md:pt-14 max-md:pb-8">
        {/* Both representations stay mounted and share a single grid cell, so switching between
        them cross-dissolves instead of unmounting one and popping the other in. */}
        <div className="my-auto grid w-full shrink-0">
          <div
            aria-hidden={showEmailPreview}
            className="card pointer-events-none invisible flex [transform:scale(0.92)_translateY(-10px)] items-center justify-center opacity-0 [filter:blur(2px)] [grid-area:1/1] [transition:opacity_260ms_cubic-bezier(0.25,1,0.5,1),transform_260ms_cubic-bezier(0.25,1,0.5,1),filter_260ms_cubic-bezier(0.25,1,0.5,1),visibility_260ms] data-[active=true]:pointer-events-auto data-[active=true]:visible data-[active=true]:[transform:none] data-[active=true]:opacity-100 data-[active=true]:[filter:none] motion-reduce:[transition:none]"
            data-active={!showEmailPreview}
          >
            <div className="my-auto flex w-full max-w-[280px] shrink-0 flex-col items-center max-md:max-w-[240px]">
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
            className="email pointer-events-none invisible flex [transform:scale(0.96)_translateY(12px)] items-center justify-center opacity-0 [filter:blur(2px)] [grid-area:1/1] [transition:opacity_260ms_cubic-bezier(0.25,1,0.5,1),transform_260ms_cubic-bezier(0.25,1,0.5,1),filter_260ms_cubic-bezier(0.25,1,0.5,1),visibility_260ms] data-[active=true]:pointer-events-auto data-[active=true]:visible data-[active=true]:[transform:none] data-[active=true]:opacity-100 data-[active=true]:[filter:none] motion-reduce:[transition:none]"
            data-active={showEmailPreview}
          >
            <div className="flex w-full max-w-[min(480px,100%-32px)] shrink-0 flex-col items-center [zoom:0.9] max-md:max-w-[min(400px,100%-32px)]">
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
