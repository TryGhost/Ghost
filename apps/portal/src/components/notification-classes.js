import { tw } from '../utils/tw';

export const notificationClasses = tw`absolute top-3 z-[99999] flex w-full max-w-[380px] animate-notification-in items-start gap-3 rounded-[7px] bg-white p-4 text-13 tracking-[0.2px] text-black shadow-notification backdrop-blur-[8px] max-sm:animate-notification-in-mobile rtl:pt-3.5 rtl:pr-5 rtl:pb-[18px] rtl:pl-[44px] [&_a]:text-black [&_a]:underline [&_a]:outline-none [&_a]:[transition:all_0.2s_ease-in-out] [&_a:hover]:opacity-80 [&_p]:m-0 [&_p]:grow [&_p]:p-0 [&_p]:text-start [&_p]:text-14 [&_p]:leading-[1.5em] [&_p]:text-black [&_p_strong]:text-black [&.hide]:hidden [&.slideout]:animate-notification-out max-sm:[&.slideout]:animate-notification-out-mobile`;

export const notificationIconClasses = tw`mt-0.5 size-[18px] min-w-[18px] rtl:right-[17px] rtl:left-auto`;

export const notificationCloseIconClasses = tw`gh-portal-notification-closeicon -my-1.5 -mr-1.5 size-3 min-w-3 cursor-pointer p-2.5 text-gray-500 opacity-80 hover:opacity-100`;
