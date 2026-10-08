import { tw } from '../utils/tw';

export const signupMessageButtonClass = tw`gh-portal-btn gh-portal-btn-link relative !ms-1 -mb-px flex cursor-pointer select-none items-center justify-center whitespace-nowrap rounded-md bg-transparent p-0 text-center text-md font-semibold leading-none tracking-[0.2px] text-black no-underline [border:none] [outline:none] [transition:all_0.25s_ease] hover:border-gray-300 hover:opacity-[0.85]`;

export const termsCheckboxClass = tw`checkbox relative top-[-1px] float-left mt-px inline-block size-[18px] shrink-0 rounded border border-solid border-gray-300 bg-white [transition:background_0.15s_ease-in-out,border-color_0.15s_ease-in-out] before:absolute before:left-[3px] before:top-1 before:h-1.5 before:w-2.5 before:opacity-0 before:content-[''] before:[border-color:currentcolor_currentcolor_theme(colors.white)_theme(colors.white)] before:[border-style:none_none_solid_solid] before:[border-width:0_0_2px_2px] before:[transform:rotate(-45deg)] before:[transition:opacity_0.15s_ease-in-out] rtl:float-right rtl:before:left-auto rtl:before:right-[3px] [.gh-portal-error_&]:border-red [.gh-portal-error_&]:[box-shadow:0_0_0_3px_rgb(240,37,37,.15)] [.gh-portal-error_input:checked+&]:[box-shadow:none] [.gh-portal-error_label:hover_input:not(:checked)+&]:border-red [input:checked+&]:border-black [input:checked+&]:bg-black [input:checked+&]:before:opacity-100 [label:hover_input:not(:checked)+&]:border-gray-400`;

export const offerBarClass = tw`gh-portal-offer-bar relative mb-6 rounded-md bg-white bg-offer-bar px-7 pb-7 pt-[26px]`;

export const offerDiscountLabelClass = tw`gh-portal-discount-label absolute right-[25px] top-[23px] -me-1 max-h-[24.5px] whitespace-nowrap rounded-[999px] px-[9px] py-1.5 text-center text-[1.25rem] font-semibold leading-[1em] tracking-[0.3px] text-black before:absolute before:inset-0 before:block before:rounded-[999px] before:bg-brand before:opacity-20 before:content-['']`;

export const amountClass = tw`amount text-[3.5rem] font-bold leading-[1em] tracking-[-1.3px] text-black max-[1440px]:text-[32px] max-[1440px]:tracking-[-0.022em]`;

export const giftCheckoutRightClasses = tw`gh-portal-gift-checkout-right top-0 flex h-screen overflow-y-auto py-3 pl-0 pr-3 [align-self:start] [position:sticky] max-[880px]:static max-[880px]:-order-1 max-[880px]:h-auto max-[880px]:overflow-visible max-[880px]:p-0`;

export const giftRevealClasses = tw`gh-portal-gift-checkout-reveal invisible grid grid-rows-[0fr] overflow-hidden [transition:grid-template-rows_250ms_cubic-bezier(0.25,1,0.5,1),visibility_250ms] data-[open=true]:visible data-[open=true]:grid-rows-[1fr] motion-reduce:[transition:none] [&[data-open=true]>.gh-portal-gift-checkout-reveal-inner]:opacity-100 [&[data-open=true]>.gh-portal-gift-checkout-reveal-inner]:[transform:translateY(0)]`;

export const giftRevealInnerClasses = tw`gh-portal-gift-checkout-reveal-inner min-h-0 overflow-hidden opacity-0 [transform:translateY(4px)] [transition:opacity_200ms_cubic-bezier(0.25,1,0.5,1),transform_200ms_cubic-bezier(0.25,1,0.5,1)] motion-reduce:[transition:none]`;

export const giftSwitchClasses = tw`gh-portal-gift-duration-switch flex h-11 w-full rounded-[999px] bg-gray-200 p-1`;

export function getGiftSwitchButtonClasses(isActive) {
  return (
    tw`gh-portal-btn relative flex h-full min-w-0 flex-1 cursor-pointer select-none items-center justify-center whitespace-nowrap rounded-[999px] border-0 border-none px-2 py-0 text-center text-md font-medium leading-[1em] tracking-[0.2px] text-black no-underline [outline:none] [transition:background-color_150ms_cubic-bezier(0.25,1,0.5,1),box-shadow_150ms_cubic-bezier(0.25,1,0.5,1),color_150ms_cubic-bezier(0.25,1,0.5,1)] focus-visible:rounded-[999px] focus-visible:[box-shadow:0_0_0_2px_var(--brandcolor)] focus-visible:[outline:none] focus-visible:[transition:background-color_150ms_cubic-bezier(0.25,1,0.5,1),box-shadow_150ms_cubic-bezier(0.25,1,0.5,1),color_150ms_cubic-bezier(0.25,1,0.5,1)] motion-reduce:[transition:none] motion-reduce:focus-visible:[transition:none]` +
    (isActive
      ? tw` active bg-white [box-shadow:0px_1px_3px_rgba(var(--blackrgb),0.08)]`
      : tw` bg-transparent`)
  );
}
