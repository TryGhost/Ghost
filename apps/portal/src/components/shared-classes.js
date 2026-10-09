import { tw } from '../utils/tw';

export const signupMessageButtonClass = tw`gh-portal-btn relative ms-1! -mb-px flex cursor-pointer items-center justify-center rounded-md bg-transparent p-0 text-center text-14 leading-none font-semibold tracking-[0.2px] whitespace-nowrap text-black no-underline outline-none select-none [border:none] transition-control hover:border-gray-300 hover:opacity-[0.85]`;

export const termsCheckboxClass = tw`checkbox relative top-[-1px] float-left mt-px inline-block size-[18px] shrink-0 rounded border border-solid border-gray-300 bg-white [transition:background_0.15s_ease-in-out,border-color_0.15s_ease-in-out] before:absolute before:top-1 before:left-[3px] before:h-1.5 before:w-2.5 before:[transform:rotate(-45deg)] before:[border-width:0_0_2px_2px] before:[border-style:none_none_solid_solid] before:[border-color:currentcolor_currentcolor_var(--color-white)_var(--color-white)] before:opacity-0 before:content-[''] before:[transition:opacity_0.15s_ease-in-out] rtl:float-right rtl:before:right-[3px] rtl:before:left-auto [.gh-portal-error_&]:border-red [.gh-portal-error_&]:[box-shadow:0_0_0_3px_rgb(240,37,37,.15)] [.gh-portal-error_input:checked+&]:[box-shadow:none] [.gh-portal-error_label:hover_input:not(:checked)+&]:border-red [input:checked+&]:border-black [input:checked+&]:bg-black [input:checked+&]:before:opacity-100 [label:hover_input:not(:checked)+&]:border-gray-400`;

export const offerBarClass = tw`relative mb-6 rounded-md bg-white bg-offer-bar px-7 pt-[26px] pb-7`;

export const offerDiscountLabelClass = tw`gh-portal-discount-label absolute top-[23px] right-[25px] -me-1 max-h-[24.5px] rounded-full px-[9px] py-1.5 text-center text-12.5 leading-[1em] font-semibold tracking-[0.3px] whitespace-nowrap text-black before:absolute before:inset-0 before:block before:rounded-full before:bg-brand before:opacity-20 before:content-['']`;

export const amountClass = tw`amount text-35 leading-[1em] font-bold tracking-[-1.3px] text-black max-xl:text-[32px] max-xl:tracking-[-0.022em]`;

export const giftCheckoutRightClasses = tw`sticky top-0 flex h-screen [align-self:start] overflow-y-auto py-3 pr-3 pl-0 max-md:static max-md:-order-1 max-md:h-auto max-md:overflow-visible max-md:p-0`;

export const giftRevealClasses = tw`invisible grid grid-rows-[0fr] overflow-hidden [transition:grid-template-rows_250ms_cubic-bezier(0.25,1,0.5,1),visibility_250ms] data-[open=true]:visible data-[open=true]:grid-rows-[1fr] motion-reduce:[transition:none] [&[data-open=true]>.gh-portal-gift-checkout-reveal-inner]:[transform:translateY(0)] [&[data-open=true]>.gh-portal-gift-checkout-reveal-inner]:opacity-100`;

export const giftRevealInnerClasses = tw`gh-portal-gift-checkout-reveal-inner min-h-0 [transform:translateY(4px)] overflow-hidden opacity-0 [transition:opacity_200ms_cubic-bezier(0.25,1,0.5,1),transform_200ms_cubic-bezier(0.25,1,0.5,1)] motion-reduce:[transition:none]`;

export const giftSwitchClasses = tw`flex h-11 w-full rounded-full bg-gray-200 p-1`;

export function getGiftSwitchButtonClasses(isActive) {
  return (
    tw`gh-portal-btn relative flex h-full min-w-0 flex-1 cursor-pointer items-center justify-center rounded-full border-0 border-none px-2 py-0 text-center text-14 leading-[1em] font-medium tracking-[0.2px] whitespace-nowrap text-black no-underline outline-none select-none [transition:background-color_150ms_cubic-bezier(0.25,1,0.5,1),box-shadow_150ms_cubic-bezier(0.25,1,0.5,1),color_150ms_cubic-bezier(0.25,1,0.5,1)] focus-visible:rounded-full focus-visible:[box-shadow:0_0_0_2px_var(--brandcolor)] focus-visible:outline-none focus-visible:[transition:background-color_150ms_cubic-bezier(0.25,1,0.5,1),box-shadow_150ms_cubic-bezier(0.25,1,0.5,1),color_150ms_cubic-bezier(0.25,1,0.5,1)] motion-reduce:[transition:none] motion-reduce:focus-visible:[transition:none]` +
    (isActive
      ? tw` active bg-white [box-shadow:0px_1px_3px_rgba(var(--blackrgb),0.08)]`
      : tw` bg-transparent`)
  );
}
