import { tw } from '../utils/tw';

export const notificationClasses = tw`absolute top-3 z-[99999] flex w-full max-w-[380px] animate-[notification-slidein_0.55s_cubic-bezier(0.215,0.610,0.355,1.000)] items-start gap-3 rounded-[7px] bg-white p-4 text-sm tracking-[0.2px] text-black backdrop-blur-[8px] [box-shadow:0px_0px_1px_0px_rgba(0,0,0,0.30),0px_51px_40px_0px_rgba(0,0,0,0.05),0px_15.375px_12.059px_0px_rgba(0,0,0,0.03),0px_6.386px_5.009px_0px_rgba(0,0,0,0.03),0px_2.31px_1.812px_0px_rgba(0,0,0,0.02)] max-sm:animate-[notification-slidein-mobile_0.55s_cubic-bezier(0.215,0.610,0.355,1.000)] rtl:pb-[18px] rtl:pl-[44px] rtl:pr-5 rtl:pt-3.5 [&.hide]:hidden [&.slideout]:animate-[notification-slideout_0.4s_cubic-bezier(0.550,0.055,0.675,0.190)] max-sm:[&.slideout]:animate-[notification-slideout-mobile_0.55s_cubic-bezier(0.550,0.055,0.675,0.190)] [&_a:hover]:opacity-80 [&_a]:text-black [&_a]:underline [&_a]:[outline:none] [&_a]:[transition:all_0.2s_ease-in-out] [&_p]:m-0 [&_p]:grow [&_p]:p-0 [&_p]:text-start [&_p]:text-md [&_p]:leading-[1.5em] [&_p]:text-black [&_p_strong]:text-black`;

export const notificationIconClasses = tw`mt-0.5 size-[18px] min-w-[18px] rtl:left-auto rtl:right-[17px]`;

export const notificationCloseIconClasses = tw`gh-portal-notification-closeicon -my-1.5 -mr-1.5 size-3 min-w-3 cursor-pointer p-2.5 text-gray-500 opacity-80 hover:opacity-100`;
