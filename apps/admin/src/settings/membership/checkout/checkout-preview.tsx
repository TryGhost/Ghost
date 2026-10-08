import React from 'react';
import type { StripeCheckoutBorderStyle } from '@tryghost/checkout';
import type { StripeCheckoutDesign } from '@tryghost/admin-x-framework/api/stripe-checkout-config';
import { Color } from '@tryghost/color-utils';
import { LucideIcon } from '@tryghost/shade/utils';
import { Skeleton } from '@tryghost/shade/components';
import { STRIPE_FONTS_CSS, fontFamilyOf } from './stripe-fonts';

// The sketch is drawn at desktop size and shrunk with `zoom`, which (unlike a transform)
// also shrinks its layout box, so it stays centered with room around it.
const PREVIEW_SCALE = 0.75;

// Inputs and buttons take the full corner style. Boxes that hold several rows get a gentler
// radius, otherwise "pill" turns a multi-line box into an oval.
const CORNER_RADII: Record<StripeCheckoutBorderStyle, { radius: string; boxRadius: string }> = {
  rounded: { radius: '6px', boxRadius: '8px' },
  rectangular: { radius: '0px', boxRadius: '0px' },
  pill: { radius: '999px', boxRadius: '16px' },
};

// Stripe keeps white text on a color until white would fall below 3:1 contrast, then
// switches to near-black. Stripe doesn't document this; the rule fits every color seen on
// its pages (#e5487a, #ff0000, #533afe, #0074d4, #0f3359 white; #00ff9d dark).
const legibleTextOn = (background: string) =>
  Color(background).contrast(Color('#ffffff')) >= 3 ? '#ffffff' : '#1a1a1a';

const Placeholder: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span className="truncate text-[15px] text-neutral-400">{children}</span>
);

const Block: React.FC<{ className: string }> = ({ className }) => (
  <Skeleton className={className} containerClassName="block" />
);

/** The page while the saved design is loading, with no colors, so no design flashes first. */
const SketchSkeleton: React.FC = () => (
  <div aria-busy="true" className="flex grow overflow-hidden">
    <div className="flex w-1/2 shrink-0 flex-col p-8">
      <Block className="h-8 w-48" />
    </div>
    <div className="relative flex w-1/2 grow flex-col gap-4 bg-white p-8 pb-20 shadow-[15px_0_30px_0_rgba(0,0,0,0.18)]">
      <Block className="h-[60px]" />
      <Block className="h-[134px]" />
      <Block className="h-10" />
    </div>
  </div>
);

/**
 * A sketch of Stripe Checkout in the given design, like the Signup portal card: it draws what
 * the publisher controls (colors, corners, font) and Stripe's own parts as an empty form with
 * placeholder text, not grey bars, which would read as a page still loading.
 */
const CheckoutPreview: React.FC<{
  design: StripeCheckoutDesign;
  displayName: string;
  loading?: boolean;
}> = ({ design, displayName, loading }) => {
  const { radius, boxRadius } = CORNER_RADII[design.border_style];

  return (
    // Centered in the whole pane, not only the space under the toolbar: the spacer mirrors
    // the toolbar below the sheet and gives way first when the sheet is tall.
    <div className="flex size-full flex-col items-center overflow-y-auto p-8">
      <figure
        aria-label="Checkout preview"
        className="my-auto flex min-h-[512px] w-full max-w-[820px] shrink-0 flex-col overflow-hidden rounded-2xl bg-white shadow-xl"
        style={{ zoom: PREVIEW_SCALE }}
      >
        <link href={STRIPE_FONTS_CSS} rel="stylesheet" />
        <div className="shrink-0 p-4">
          <div className="flex h-9 items-center gap-2 rounded-full bg-neutral-100 px-4 text-[15px] text-neutral-400">
            <LucideIcon.Lock className="size-4" />
            checkout.stripe.com
          </div>
        </div>
        {loading ? (
          <SketchSkeleton />
        ) : (
          <div
            className="flex grow overflow-hidden"
            style={{ fontFamily: fontFamilyOf(design.font_family) }}
          >
            <div
              className="flex w-1/2 shrink-0 flex-col gap-6 p-8"
              style={{
                backgroundColor: design.background_color,
                color: legibleTextOn(design.background_color),
              }}
            >
              <div className="flex items-center gap-2">
                {/* Ghost doesn't send an icon or logo to Stripe, so the real page shows the
                    one set in the Stripe dashboard. */}
                <div className="flex size-8 items-center justify-center rounded-full border border-current/15">
                  <LucideIcon.Store className="size-4 opacity-60" />
                </div>
                <span className="text-[19px] font-bold">{displayName}</span>
              </div>
            </div>
            {/* The shadow is Stripe's own divider: only its blur reaches the summary, so the
                halves stay apart even when both are white. */}
            <div className="relative flex w-1/2 grow flex-col gap-4 bg-white p-8 pb-20 text-neutral-900 shadow-[15px_0_30px_0_rgba(0,0,0,0.18)]">
              <div className="flex flex-col gap-1.5">
                <span className="text-[16px] font-semibold">Email</span>
                <div
                  className="flex h-9 items-center border border-neutral-200 px-3"
                  style={{ borderRadius: radius }}
                >
                  <Placeholder>email@example.com</Placeholder>
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <span className="text-[16px] font-semibold">Payment method</span>
                <div
                  aria-hidden="true"
                  className="flex flex-col gap-3 border border-neutral-200 p-3"
                  style={{ borderRadius: boxRadius }}
                >
                  <span className="flex items-center gap-2 text-[15px] font-medium">
                    <LucideIcon.CreditCard className="size-4" />
                    Card
                  </span>
                  <div
                    className="flex flex-col border border-neutral-200"
                    style={{ borderRadius: boxRadius }}
                  >
                    <div className="flex h-9 items-center px-3">
                      <Placeholder>1234 1234 1234 1234</Placeholder>
                    </div>
                    <div className="grid h-9 grid-cols-2 border-t border-neutral-200">
                      <div className="flex items-center px-3">
                        <Placeholder>MM / YY</Placeholder>
                      </div>
                      <div className="flex items-center border-l border-neutral-200 px-3">
                        <Placeholder>CVC</Placeholder>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              {/* Labelled "Pay" like Stripe's own preview; the live label depends on what is
                  being bought, such as "Subscribe". */}
              <div
                className="flex h-10 items-center justify-center text-[16px] font-medium"
                style={{
                  backgroundColor: design.button_color,
                  borderRadius: radius,
                  color: legibleTextOn(design.button_color),
                }}
              >
                Pay
              </div>
            </div>
          </div>
        )}
      </figure>
      <div aria-hidden="true" className="h-20" />
    </div>
  );
};

export default CheckoutPreview;
