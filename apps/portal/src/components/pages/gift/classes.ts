import clsx from 'clsx';
import { tw } from '../../../utils/tw';

export const giftCheckoutRightClass = tw`sticky top-0 flex h-screen [align-self:start] overflow-y-auto py-3 pr-3 pl-0 max-md:static max-md:-order-1 max-md:h-auto max-md:overflow-visible max-md:p-0`;

export const giftRevealClass = tw`invisible grid grid-rows-[0fr] overflow-hidden [transition:grid-template-rows_250ms_var(--ease-out-quart),visibility_250ms] data-[open=true]:visible data-[open=true]:grid-rows-[1fr] motion-reduce:[transition:none] [&[data-open=true]>.gh-portal-gift-checkout-reveal-inner]:[transform:translateY(0)] [&[data-open=true]>.gh-portal-gift-checkout-reveal-inner]:opacity-100`;

export const giftRevealInnerClass = tw`gh-portal-gift-checkout-reveal-inner min-h-0 [transform:translateY(4px)] overflow-hidden opacity-0 [transition:opacity_200ms_var(--ease-out-quart),transform_200ms_var(--ease-out-quart)] motion-reduce:[transition:none]`;

export const giftSwitchClass = tw`flex h-11 w-full rounded-full bg-gray-150 p-1`;

export function getGiftSwitchButtonClass(isActive: boolean) {
  return clsx(
    tw`gh-portal-btn relative flex h-full min-w-0 flex-1 cursor-pointer items-center justify-center rounded-full border-0 border-none px-2 py-0 text-center text-14 leading-[1em] font-medium tracking-[0.2px] whitespace-nowrap text-gray-950 no-underline outline-none select-none [transition:background-color_150ms_var(--ease-out-quart),box-shadow_150ms_var(--ease-out-quart),color_150ms_var(--ease-out-quart)] focus-visible:rounded-full focus-visible:[box-shadow:0_0_0_2px_var(--brandcolor)] focus-visible:outline-none focus-visible:[transition:background-color_150ms_var(--ease-out-quart),box-shadow_150ms_var(--ease-out-quart),color_150ms_var(--ease-out-quart)] motion-reduce:[transition:none] motion-reduce:focus-visible:[transition:none]`,
    isActive ? tw`bg-white [box-shadow:0px_1px_3px_rgb(0_0_0/0.08)]` : 'bg-transparent',
  );
}

export const giftTitleClass = tw`mb-2 text-start text-32 leading-[1.15] text-pretty text-gray-950 max-sm:text-26`;

export const giftSubtitleClass = tw`gh-portal-gift-checkout-subtitle m-0 text-15 leading-[1.45em] text-pretty text-gray-800`;

export const giftInnerClass = tw`relative z-[1] my-auto flex w-full max-w-[496px] flex-col`;

export const giftLeftClass = tw`relative flex items-center justify-center bg-white p-12 max-md:px-6 max-md:pt-8 max-md:pb-6`;

export const giftPreviewClass = tw`flex min-h-0 flex-1 flex-col items-center overflow-y-auto rounded-[32px] px-12 py-16 [background:linear-gradient(180deg,rgba(0,0,0,0.3)_0%,rgba(0,0,0,0)_100%),var(--brandcolor)] max-md:rounded-t-none max-md:px-6 max-md:pt-14 max-md:pb-8`;

export const giftCardStageClass = tw`my-auto flex w-full max-w-[280px] shrink-0 flex-col items-center max-md:max-w-[240px] [&[data-revealing=true]_.gh-portal-gift-checkout-card-frame]:[transform:rotate(3deg)]`;
