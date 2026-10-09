import clsx from 'clsx';
import { tw } from '../utils/tw';

export const signupMessageButtonClass = tw`gh-portal-btn relative ms-1! -mb-px flex cursor-pointer items-center justify-center rounded-md border-none bg-transparent p-0 text-center text-14 leading-none font-semibold tracking-[0.2px] whitespace-nowrap text-black no-underline outline-none select-none transition-control hover:border-gray-300 hover:opacity-85`;

export const termsCheckboxClass = tw`checkbox relative top-[-1px] float-left mt-px inline-block size-4.5 shrink-0 rounded border border-solid border-gray-300 bg-white [transition:background_0.15s_ease-in-out,border-color_0.15s_ease-in-out] before:absolute before:top-1 before:left-[3px] before:h-1.5 before:w-2.5 before:[transform:rotate(-45deg)] before:[border-width:0_0_2px_2px] before:[border-style:none_none_solid_solid] before:[border-color:currentcolor_currentcolor_var(--color-white)_var(--color-white)] before:opacity-0 before:content-[''] before:[transition:opacity_0.15s_ease-in-out] rtl:float-right rtl:before:right-[3px] rtl:before:left-auto [.gh-portal-error_&]:border-red [.gh-portal-error_&]:[box-shadow:0_0_0_3px_rgb(240,37,37,.15)] [.gh-portal-error_input:checked+&]:[box-shadow:none] [.gh-portal-error_label:hover_input:not(:checked)+&]:border-red [input:checked+&]:border-black [input:checked+&]:bg-black [input:checked+&]:before:opacity-100 [label:hover_input:not(:checked)+&]:border-gray-400`;

export const offerBarClass = tw`relative mb-6 rounded-md bg-white bg-offer-bar px-7 pt-6.5 pb-7`;

export const offerDiscountLabelClass = tw`gh-portal-discount-label absolute top-[23px] right-[25px] -me-1 max-h-[24.5px] rounded-full px-[9px] py-1.5 text-center text-12.5 leading-[1em] font-semibold tracking-[0.3px] whitespace-nowrap text-black before:absolute before:inset-0 before:block before:rounded-full before:bg-brand before:opacity-20 before:content-['']`;

export const amountClass = tw`amount text-35 leading-[1em] font-bold tracking-[-1.3px] text-black max-xl:text-[32px] max-xl:tracking-[-0.022em]`;

export const popupHeaderClass = tw`relative mx-0 -mt-0.5 mb-10 flex items-center justify-center px-15 max-sm:mt-1`;

export const accountActionClass = tw`cursor-pointer focus-visible:shadow-focus-brand focus-visible:outline-none`;

export const accountActionTextClass = tw`grow [&_h3]:text-15 [&_h3]:font-semibold [&_p]:ms-0 [&_p]:me-2 [&_p]:mt-[5px] [&_p]:mb-0 [&_p]:text-14.5 [&_p]:leading-[1.3em] [&_p]:tracking-[0.3px] [&_p]:[word-break:break-word] [&_p]:text-gray-700`;

export const accountActionButtonClass = tw`-mx-1 my-0 flex min-h-9.5 items-center justify-center px-1 py-0 text-15 leading-[1em] font-medium tracking-[0.2px] whitespace-nowrap text-brand select-none`;

export const productPriceClass = tw`gh-portal-product-price flex justify-center text-black`;

export const productNameClass = tw`-mt-1 w-full text-18 leading-[1.3em] font-semibold tracking-[0px] [word-break:break-word] text-brand`;

export const productDescriptionClass = tw`mt-4 w-full text-15.5 leading-[1.4em] font-semibold`;

export const inputLabelContainerClass = tw`gh-portal-input-labelcontainer flex w-full justify-between`;

export const inputLabelClass = tw`gh-portal-input-label mb-0.5 text-13 font-semibold tracking-[0px] text-gray-950`;

export const currencySignClass = (isLong = false) =>
  clsx(
    tw`self-start text-27 leading-[1.135em] font-bold max-[371px]:text-18`,
    isLong && 'me-[5px]',
  );
