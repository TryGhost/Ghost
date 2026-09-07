import giftCardNoiseUrl from '../../images/gift-card-noise.webp';
import giftCardOrbUrl from '../../images/gift-card-orb.webp';

export const GiftPageStyles = `
@property --shine-angle {
    syntax: '<angle>';
    inherits: false;
    initial-value: 243.43deg;
}

.gh-portal-popup-container.full-size.gift,
.gh-portal-popup-container.full-size.giftSuccess,
.gh-portal-popup-container.full-size.giftRedemption {
    padding: 0;
}

/* Anchor the close and back controls to the full-page gift surface. */
.gh-portal-content.gift .gh-portal-closeicon-container,
.gh-portal-content.giftSuccess .gh-portal-closeicon-container,
.gh-portal-content.giftRedemption .gh-portal-closeicon-container {
    position: absolute;
    top: 32px;
    right: 32px;
}

/* The plans page's back control, reused here rather than the chevron one. The
   resets match .gh-portal-back-sitetitle .gh-portal-btn in SignupPageStyles
   exactly; only the positioning differs, since that wrapper isn't used here.

   Anchored to the left column rather than the page so the button stays with the
   form when the layout stacks below 880px.

   display is restated because the shared rule hides this button below 960px:
   the plans page has nothing to go back to at that width, but the gift flow's
   delivery step always does. */
.gh-portal-content.gift .gh-portal-btn-site-title-back {
    display: flex;
    position: absolute;
    top: 32px;
    left: 32px;
    height: auto;
    padding: 0;
    border: 0;
    font-size: 1.5rem;
    line-height: 1em;
    color: var(--grey1);
}

html[dir="rtl"] .gh-portal-content.gift .gh-portal-btn-site-title-back {
    right: 32px;
    left: unset;
}

/* The CloseButton component sets the accent colour inline (style={{color}}),
   which would render the X in the brand colour — invisible against the pink
   panel. !important lets these white rules win over that inline style. */
.gh-portal-popup-container.full-size.gift .gh-portal-closeicon,
.gh-portal-popup-container.full-size.giftSuccess .gh-portal-closeicon,
.gh-portal-popup-container.full-size.giftRedemption .gh-portal-closeicon {
    color: rgba(255, 255, 255, 0.65) !important;
}

.gh-portal-popup-container.full-size.gift .gh-portal-closeicon:hover,
.gh-portal-popup-container.full-size.giftSuccess .gh-portal-closeicon:hover,
.gh-portal-popup-container.full-size.giftRedemption .gh-portal-closeicon:hover {
    color: rgba(255, 255, 255, 0.9) !important;
}

.gh-portal-content.gift,
.gh-portal-content.giftSuccess,
.gh-portal-content.giftRedemption {
    position: relative;
    padding: 0;
    min-height: 100vh;
}

.gh-portal-gift-checkout {
    display: grid;
    grid-template-columns: 1fr 1fr;
    min-height: 100vh;
    width: 100%;
}

/* The left column vertically centres its content (like production): short
   content sits in the middle, and as content grows it expands into the space
   above/below. The column grows with its content (min-height, no fixed height),
   so tall content simply scrolls rather than clipping. */
.gh-portal-gift-checkout-left {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--white);
    padding: 48px;
}

.gh-portal-gift-checkout-bg {
    display: none;
}

.gh-portal-gift-checkout-inner {
    position: relative;
    z-index: 1;
    width: 100%;
    max-width: 496px;
    display: flex;
    flex-direction: column;
    /* Vertically centre within the column via auto margins rather than
       align-items: centering a flex child clips (and can't scroll to) any
       overflow, whereas auto margins collapse to 0 when content is taller than
       the viewport, so tall content simply scrolls with the top reachable. */
    margin-block: auto;
}

.gh-portal-gift-checkout-header {
    margin-bottom: 12px;
}

.gh-portal-gift-checkout-header .gh-portal-main-title {
    text-align: start;
    margin: 0 0 8px;
    font-size: 3.2rem;
    line-height: 1.15;
}

/* The delivery step is a form, not a pitch — a calmer title keeps the focus on
   the questions below rather than repeating the marketing headline. */
.gh-portal-gift-checkout-header .gh-portal-gift-checkout-step-title {
    font-size: 2.2rem;
}

.gh-portal-gift-checkout-subtitle {
    margin: 0;
    font-size: 1.5rem;
    line-height: 1.45em;
    color: var(--grey3);
    text-wrap: pretty;
}

/* Emphasised gift details mirror the delivery email. */
.gh-portal-gift-checkout-subtitle strong {
    font-weight: 600;
    color: var(--grey0);
}

.gh-portal-gift-checkout-subtitle p {
    margin: 0 0 8px;
}

.gh-portal-gift-checkout-subtitle p:last-child {
    margin-bottom: 0;
}

.gh-portal-gift-checkout-subtitle a {
    color: inherit;
    text-decoration: underline;
}

.gh-portal-gift-checkout-section {
    margin-top: 24px;
}

/* Section/input labels: a blend of the old small-caps labels and the
   sentence-case question headings — the caps' size and quiet colour moved a
   step bolder and darker, in sentence case, sized to match the text inside
   the delivery-method toggle so the two label voices on the step agree. */
.gh-portal-gift-checkout-label {
    font-size: 1.4rem;
    font-weight: 600;
    color: var(--grey4);
    margin-bottom: 8px;
}

/* The label runs at 1.4rem and the error beside it at 1.3rem with its own
   line-height, so stretching them to equal heights left the two sitting at
   different levels. Baseline alignment lands them on the same line regardless
   of the size difference. */
.gh-portal-gift-checkout .gh-portal-input-labelcontainer {
    align-items: baseline;
    margin-bottom: 8px;
}

.gh-portal-gift-checkout .gh-portal-input-label {
    font-size: 1.4rem;
    font-weight: 600;
    color: var(--grey4);
    margin-bottom: 0;
}

.gh-portal-gift-checkout .gh-portal-input {
    height: 48px;
}

.gh-portal-gift-duration-switch {
    display: flex;
    background: var(--grey12);
    width: 100%;
    border-radius: 999px;
    padding: 4px;
    height: 44px;
    margin: 0;
}

/* When only one length is offered there's nothing to switch — state it plainly
   as a fixed fact rather than a control. */
.gh-portal-gift-checkout-single-duration {
    font-size: 1.6rem;
    line-height: 1.3;
    font-weight: 600;
    color: var(--grey0);
}

.gh-portal-gift-duration-switch .gh-portal-btn {
    flex: 1;
    min-width: 0;
    border: 0;
    height: 100% !important;
    border-radius: 999px;
    background: transparent;
    font-size: 1.4rem;
    white-space: nowrap;
    padding: 0 8px;
}

.gh-portal-gift-duration-switch .gh-portal-btn.active {
    background: var(--white);
    box-shadow: 0px 1px 3px rgba(var(--blackrgb), 0.08);
    color: var(--grey0);
}

/* Keyboard focus is invisible on these custom radio controls otherwise. */
.gh-portal-gift-duration-switch .gh-portal-btn:focus-visible {
    outline: none;
    box-shadow: 0 0 0 2px var(--brandcolor);
}

/* Animation values follow Emil Kowalski's practical tips: a custom ease-out
   curve (built-in CSS easings are usually not strong enough), durations kept
   under 300ms so a control used repeatedly never feels slow, and the moving
   content animates opacity + transform only. */
.gh-portal-gift-duration-switch .gh-portal-btn {
    transition:
        background-color 150ms cubic-bezier(0.25, 1, 0.5, 1),
        box-shadow 150ms cubic-bezier(0.25, 1, 0.5, 1),
        color 150ms cubic-bezier(0.25, 1, 0.5, 1);
}

/* Expand/collapse for toggle-dependent recipient details. The 0fr→1fr grid
   transition animates the height in BOTH
   directions with the content kept mounted — same trick as the tier benefits
   above — while the inner pane fades and rises a few pixels. visibility
   transitions discretely (visible throughout the collapse, hidden once it
   finishes), which also keeps the collapsed controls unfocusable. */
.gh-portal-gift-checkout-reveal {
    display: grid;
    grid-template-rows: 0fr;
    visibility: hidden;
    overflow: hidden;
    transition:
        grid-template-rows 250ms cubic-bezier(0.25, 1, 0.5, 1),
        visibility 250ms;
}

.gh-portal-gift-checkout-reveal[data-open='true'] {
    grid-template-rows: 1fr;
    visibility: visible;
}

.gh-portal-gift-checkout-reveal-inner {
    min-height: 0;
    overflow: hidden;
    opacity: 0;
    transform: translateY(4px);
    transition:
        opacity 200ms cubic-bezier(0.25, 1, 0.5, 1),
        transform 200ms cubic-bezier(0.25, 1, 0.5, 1);
}

/* Direct child only so nested character-count reveals keep their own state. */
.gh-portal-gift-checkout-reveal[data-open='true'] > .gh-portal-gift-checkout-reveal-inner {
    opacity: 1;
    transform: translateY(0);
}

@media (prefers-reduced-motion: reduce) {
    .gh-portal-gift-duration-switch .gh-portal-btn,
    .gh-portal-gift-checkout-reveal,
    .gh-portal-gift-checkout-reveal-inner,
    .gh-portal-gift-checkout-stage-item,
    .gh-portal-gift-email-date {
        transition: none;
    }

    .gh-portal-gift-email,
    .gh-portal-gift-email-from,
    .gh-portal-gift-email-to,
    .gh-portal-gift-email-body {
        animation: none;
    }
}

.gh-portal-gift-checkout-tiers {
    display: flex;
    flex-direction: column;
    gap: 12px;
}

.gh-portal-gift-checkout-tier-item {
    background: var(--white);
    border: 1px solid var(--grey11);
    border-radius: 10px;
    overflow: hidden;
    transition: border-color 0.2s ease, background-color 0.2s ease;
}

.gh-portal-gift-checkout-tier-item:hover {
    border-color: var(--grey9);
}

.gh-portal-gift-checkout-tiers.single .gh-portal-gift-checkout-tier-item:hover {
    border-color: var(--grey11);
}

.gh-portal-gift-checkout-tier-item.selected {
    border-color: var(--brandcolor);
    background: color-mix(in srgb, var(--brandcolor) 6%, var(--white));
    box-shadow: 0 0 0 1px var(--brandcolor) inset;
}

.gh-portal-gift-checkout-tier {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    width: 100%;
    background: transparent;
    border: none;
    padding: 16px 20px;
    cursor: pointer;
    text-align: start;
    font: inherit;
    color: inherit;
}

.gh-portal-gift-checkout-tiers.single .gh-portal-gift-checkout-tier {
    cursor: default;
}

.gh-portal-gift-checkout-tier:focus-visible {
    outline: none;
    box-shadow: 0 0 0 2px var(--brandcolor) inset;
}

.gh-portal-gift-checkout-tier-radio {
    flex-shrink: 0;
    width: 18px;
    height: 18px;
    margin-top: 3px;
    border-radius: 50%;
    border: 1.5px solid var(--grey9);
    background: var(--white);
    position: relative;
}

.gh-portal-gift-checkout-tier-item.selected .gh-portal-gift-checkout-tier-radio {
    border-color: var(--brandcolor);
    background: var(--brandcolor);
}

.gh-portal-gift-checkout-tier-item.selected .gh-portal-gift-checkout-tier-radio::after {
    content: '';
    position: absolute;
    top: 50%;
    left: 50%;
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: var(--white);
    transform: translate(-50%, -50%);
}

.gh-portal-gift-checkout-tier-content {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 4px;
}

.gh-portal-gift-checkout-tier-heading {
    display: flex;
    align-items: baseline;
    gap: 10px;
}

.gh-portal-gift-checkout-tier-name {
    flex: 1;
    font-size: 1.5rem;
    font-weight: 500;
    color: var(--grey0);
}

.gh-portal-gift-checkout-tier-price {
    font-size: 1.5rem;
    font-weight: 600;
    color: var(--grey0);
}

.gh-portal-gift-checkout-tier-description {
    margin: 0;
    margin-top: -2px;
    font-size: 1.4rem;
    line-height: 1.4;
    color: var(--grey4);
}

.gh-portal-gift-checkout-tier-benefits {
    display: grid;
    grid-template-rows: 0fr;
    transition: grid-template-rows 0.3s ease;
    /* overflow + padding-free inner: Chrome leaks the first benefit through
       a 0fr track if the grid item has padding (min-size includes padding). */
    overflow: hidden;
}

.gh-portal-gift-checkout-tier-benefits[data-open="true"] {
    grid-template-rows: 1fr;
}

.gh-portal-gift-checkout-tier-benefits-inner {
    min-height: 0;
    overflow: hidden;
}

.gh-portal-gift-checkout-tier-benefits-inner > .gh-portal-gift-checkout-benefits {
    padding: 0 20px 20px 22px;
}

.gh-portal-gift-checkout-benefits {
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.gh-portal-gift-checkout-benefit {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    color: var(--grey1);
    font-size: 1.45rem;
    line-height: 1.4;
}

.gh-portal-gift-checkout-benefit svg {
    width: 14px;
    height: 14px;
    margin-top: 3px;
    color: var(--grey1);
    flex-shrink: 0;
}

.gh-portal-gift-checkout-right-panel .gh-portal-gift-checkout-benefit {
    color: rgba(255, 255, 255, 0.85);
}

/* Checkmark SVG hard-codes its stroke so it can't be themed via color. */
.gh-portal-gift-checkout-right-panel .gh-portal-gift-checkout-benefit svg path {
    stroke: rgba(255, 255, 255, 0.85);
}

.gh-portal-gift-checkout-textarea {
    height: auto;
    min-height: 96px;
    /* The counter sits directly under this field, so drop the input's default
       bottom margin — it and the counter's own margin were stacking into a
       gap that left the count floating unattached. */
    margin-bottom: 0;
    padding: 10px 12px;
    resize: none;
    font-family: inherit;
    line-height: 1.5em;
}


.gh-portal-gift-checkout-message-count {
    margin: 6px 0 0;
    text-align: right;
    color: var(--grey8);
    font-size: 1.2rem;
    letter-spacing: 0.02em;
}

.gh-portal-gift-checkout-delivery-date {
    margin-top: 16px;
}

.gh-portal-gift-checkout-delivery-date .gh-portal-input {
    margin-bottom: 0;
    box-sizing: border-box;
}

.gh-portal-gift-checkout-delivery-error {
    margin: 8px 0 0;
    color: var(--red);
    font-size: 1.3rem;
    letter-spacing: 0.35px;
    line-height: 1.6em;
}

.gh-portal-gift-checkout .gh-portal-btn-primary {
    border-radius: 999px;
}

/* Desktop: the CTA flows at the end of the (vertically-centered) content.
   Sticky-pinning it here fought the centering and floated it over the
   duration/tier rows. Mobile re-enables sticky below, where the stacked
   layout genuinely scrolls. */
/* The CTA sticks to the bottom of the scrolling column (as in production), so
   it stays reachable while a long tier list scrolls above it. The white-to-
   transparent gradient lets content fade softly under it rather than butting
   up against the button. When content fits, sticky is inert and the button
   sits at its natural position. */
/* The top padding isn't spacing — it's the run-up the sticky gradient needs to
   fade content out as it scrolls under the button. So the 24px gap the rest of
   the form uses between fields lives there rather than in a margin on top of
   it; a margin as well would have made the gap 24px larger than every other. */
.gh-portal-gift-checkout-cta-wrapper {
    position: sticky;
    bottom: 0;
    margin-top: 0;
    padding: 24px 0;
    background: linear-gradient(0deg, rgba(var(--whitergb), 1) 78%, rgba(var(--whitergb), 0) 100%);
    z-index: 1;
}

.gh-portal-gift-checkout-cta {
    width: 100%;
    height: 48px;
    font-size: 1.5rem;
    font-weight: 600;
}

.gh-portal-gift-checkout-cta-note {
    margin: 12px 0 0;
    text-align: center;
    font-size: 1.3rem;
    line-height: 1.4em;
    color: var(--grey6);
}

.gh-portal-gift-checkout-right {
    position: sticky;
    top: 0;
    align-self: start;
    height: 100vh;
    display: flex;
    padding: 12px 12px 12px 0;
    overflow-y: auto;
}

.gh-portal-gift-checkout-right-panel {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    background:
        linear-gradient(180deg, rgba(0, 0, 0, 0.3) 0%, rgba(0, 0, 0, 0) 100%),
        var(--brandcolor);
    border-radius: 32px;
    padding: 64px 48px 64px;
    overflow-y: auto;
    min-height: 0;
}

/* Cross-dissolve stage
/* -----------------------------------------------------
   The gift card and the email preview share one grid cell so a switch hands
   over between them instead of unmounting one and popping the other in.
   Each side leaves in the direction it belongs — the card lifts back and
   away, the email settles downward — and the outgoing side blurs slightly,
   the last-resort trick for bridging two pictures that share no common
   shape. Same easing and sub-300ms timing as the form reveals. */
.gh-portal-gift-checkout-stage {
    display: grid;
    width: 100%;
    margin-block: auto;
    flex-shrink: 0;
}

.gh-portal-gift-checkout-stage-item {
    grid-area: 1 / 1;
    display: flex;
    align-items: center;
    justify-content: center;
    opacity: 0;
    visibility: hidden;
    pointer-events: none;
    transition:
        opacity 260ms cubic-bezier(0.25, 1, 0.5, 1),
        transform 260ms cubic-bezier(0.25, 1, 0.5, 1),
        filter 260ms cubic-bezier(0.25, 1, 0.5, 1),
        visibility 260ms;
}

.gh-portal-gift-checkout-stage-item.card {
    transform: scale(0.92) translateY(-10px);
    filter: blur(2px);
}

.gh-portal-gift-checkout-stage-item.email {
    transform: scale(0.96) translateY(12px);
    filter: blur(2px);
}

/* No filter at all while active: a lingering blur(0) would create a
   containing block and flatten the card's 3D tilt. */
.gh-portal-gift-checkout-stage-item[data-active="true"] {
    opacity: 1;
    visibility: visible;
    pointer-events: auto;
    transform: none;
    filter: none;
}

/* The success, redemption and magic-link pages drop this straight into the
   panel with no cross-dissolve stage around it, so it has to centre itself.
   Inside the stage the auto margins simply agree with its align-items. */
.gh-portal-gift-checkout-card-stack {
    display: flex;
    flex-direction: column;
    align-items: center;
    width: 100%;
    max-width: 280px;
    margin-block: auto;
    flex-shrink: 0;
}

.gh-portal-gift-checkout-card-frame {
    width: 100%;
    transform-style: preserve-3d;
    perspective: 1200px;
    transition: transform 0.3s ease;
    position: sticky;
    top: 0;
    z-index: 1;
}

/* Delivery email preview
/* -----------------------------------------------------
   Shown in place of the gift card while the buyer is composing an emailed
   gift. This is a faithful preview rather than a stylised one: the sheet
   reproduces the delivery template's palette (#15212A headings, #3A464C
   body, the note's panel and attribution tinted from the accent) and its
   order, so what fills in here is what the recipient opens.

   Three things the email carries are left out, all of them the recipient's
   business rather than the buyer's: the redeem button, the expiry line and
   the sent-from footer. The decorative quote mark goes the other way — it's
   here only, because email clients can't render the SVG and the typographic
   glyph is the squared-off one this design moved away from.

   Motion follows the same tips as the form reveals: strong custom ease-out,
   under 300ms, no scaling from zero. */
/* Scaled rather than restyled: the message previews something with fixed
   proportions, so shrinking type and padding independently would drift it away
   from the email it's showing. zoom, not a transform, because it takes the
   layout down with it — a transform would leave the full-size box behind as
   dead space around it.

   It belongs on this element rather than the preview inside it, because this is
   where the width is pinned. Zooming the child instead left the width alone —
   its width of 100% resolved against this box and then divided by the zoom, so
   it laid out at 600px and rendered back to the same 480 — while every fixed
   pixel inside it shrank. The result was a box the same width as before with
   smaller contents, which is exactly the wrong shape. */
.gh-portal-gift-checkout-email-stack {
    display: flex;
    flex-direction: column;
    align-items: center;
    width: 100%;
    max-width: min(480px, 100% - 32px);
    zoom: 0.9;
    flex-shrink: 0;
}

.gh-portal-gift-email {
    width: 100%;
}

@keyframes gh-portal-gift-email-fade {
    from {
        opacity: 0;
        transform: translateY(4px);
    }
    to {
        opacity: 1;
        transform: none;
    }
}

/* No colour or size of its own — it sits inside the To line now and takes
   that line's type, so the two can't drift apart.

   The two dates share a grid cell and dissolve into each other. Both sides run
   the same duration with no delay, so one is always on screen: the previous
   version faded the old one out over 110ms and only started the new one 90ms
   later, which left a beat of empty space and read as a blink rather than a
   change. The 2px settle is just enough to show something happened. */
/* Matches the To line's type rather than the publisher name it now sits
   beside, so the two pieces of metadata still read as a pair. */
.gh-portal-gift-email-date {
    grid-area: 1 / 1;
    color: rgba(255, 255, 255, 0.75);
    font-size: 1.25rem;
    font-weight: 400;
    line-height: 1.2;
    white-space: nowrap;
    opacity: 0;
    transform: translateY(2px);
    transition:
        opacity 180ms cubic-bezier(0.25, 1, 0.5, 1),
        transform 180ms cubic-bezier(0.25, 1, 0.5, 1);
}

.gh-portal-gift-email-date[data-active="true"] {
    opacity: 1;
    transform: none;
}

/* Both dates share a cell so they can cross-fade in place; the stack is
   pinned to the end of the row. */
/* Pushed to the end of the To row; the recipient truncates before it does. */
/* Pinned to the end of the publisher row; the title truncates before it does. */
.gh-portal-gift-email-date-stack {
    display: grid;
    flex-shrink: 0;
    justify-items: end;
    padding-left: 12px;
}



/* Sender name on the left, send date at the container's end. */
/* Anchors the gift card that overlaps the sheet's bottom-right corner. */
.gh-portal-gift-email-sheet {
    position: relative;
    display: flex;
    flex-direction: column;
    gap: 10px;
    width: 100%;
}

/* The addressing line sits directly on the brand background above the sheet,
   carrying nothing but its own type. */
/* flex-end, so the date lines up with whatever the last line of the block
   beside it happens to be: the publisher on its own to begin with, then the
   "To" line once that opens. The date never moves — the publisher rises past
   it. */
.gh-portal-gift-email-meta {
    display: flex;
    align-items: flex-end;
    gap: 12px;
    padding: 2px 10px 6px;
}

/* Holds room for both lines from the outset and packs them to the bottom, so
   the "To" line opening lifts the publisher within this box rather than pushing
   the message below it down. The date, aligned to the same bottom edge, doesn't
   move at all — it starts level with the publisher and ends level with the
   recipient. 43px is the two lines plus their gap at this type size. */
.gh-portal-gift-email-meta-text {
    display: flex;
    flex: 1;
    flex-direction: column;
    justify-content: flex-end;
    gap: 2px;
    min-width: 0;
    min-height: 43px;
}

/* Sender name then a labelled "To:" row, the way a message detail view lists
   them. Both fade in as the buyer fills each side out. */
.gh-portal-gift-email-from,
.gh-portal-gift-email-to {
    display: flex;
    align-items: center;
    gap: 5px;
    overflow: hidden;
    font-size: 1.3rem;
    line-height: 1.2;
    text-overflow: ellipsis;
    white-space: nowrap;
    animation: gh-portal-gift-email-fade 200ms cubic-bezier(0.25, 1, 0.5, 1) both;
}

.gh-portal-gift-email-from {
    color: var(--white);
    font-weight: 600;
}

.gh-portal-gift-email-to {
    padding-top: 2px;
    color: rgba(255, 255, 255, 0.75);
    font-size: 1.25rem;
    font-weight: 400;
}

/* The row can no longer ellipsis its own text: with the date as a sibling flex
   item the recipient is an anonymous item, so it gets its own box to shrink in.
   min-width: 0 is what lets it shrink below its content width at all. */
.gh-portal-gift-email-to-value {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.gh-portal-gift-email-meta-label {
    flex-shrink: 0;
    color: rgba(255, 255, 255, 0.55);
    font-weight: 400;
}

/* A plain white sheet with even padding, so the message sits in its own space
   the way it does in a mail client. */
.gh-portal-gift-email-body {
    position: relative;
    z-index: 1;
    border-radius: 16px;
    padding: 36px 40px 40px;
    background: var(--white);
    /* Same two-layer shape as the card, dialled well back — enough to lift the
       sheet off the brand panel without competing with the card on top of it. */
    box-shadow:
        0 16px 40px rgba(var(--blackrgb), 0.1),
        0 3px 8px rgba(var(--blackrgb), 0.06);
}

/* The publication's mark, set above the subject exactly as the template places
   it. 48px is the width the email requests of the icon. flex-start rather than
   left so an RTL locale starts it on the right, as the message's own text does. */
.gh-portal-gift-email-lockup {
    display: flex;
    justify-content: flex-start;
    margin-bottom: 22px;
}

.gh-portal-gift-email-lockup-icon {
    width: 48px;
    height: 48px;
    border-radius: 4px;
    object-fit: cover;
}

.gh-portal-gift-email-lockup-title {
    color: var(--brandcolor);
    font-size: 1.7rem;
    font-weight: 700;
}

.gh-portal-gift-email-subject {
    margin: 0 0 14px;
    color: #15212A;
    font-size: 2.5rem;
    font-weight: 700;
    line-height: 1.2;
    letter-spacing: -0.01em;
    text-align: start;
}

.gh-portal-gift-email-greeting,
.gh-portal-gift-email-lede {
    margin: 0;
    color: #3A464C;
    font-size: 1.55rem;
    line-height: 1.5;
}

.gh-portal-gift-email-greeting {
    padding-bottom: 10px;
}

/* Keep the preview's emphasis at the same weight as its body copy. */
.gh-portal-gift-email-lede strong {
    color: inherit;
    font-weight: inherit;
}

/* A wash of the publisher's accent rather than the template's flat grey, so
   the buyer's note picks up the brand instead of reading as a system block.
   The grey stays as the first declaration: browsers without color-mix keep the
   template's own colour rather than falling through to nothing. (The card's
   notch already relies on color-mix, so it's established here.) */
.gh-portal-gift-email-message {
    position: relative;
    /* Matches the gap the benefits leave below it, so the note sits evenly
       between the lede and "What's included". */
    margin: 24px 0 0;
    padding: 16px 18px;
    border-radius: 8px;
    overflow: hidden;
    background: #F4F5F6;
    background: color-mix(in srgb, var(--brandcolor) 7%, var(--white));
}

/* A darker shade of the accent the container is tinted with, rather than a
   neutral grey — the attribution then belongs to the block it sits in. The
   grey stays as the fallback for browsers without color-mix. */
.gh-portal-gift-email-message-from {
    position: relative;
    margin: 10px 0 0;
    color: #738A94;
    color: color-mix(in srgb, var(--brandcolor) 72%, #15212A);
    font-size: 1.35rem;
    line-height: 1.4;
}

/* Sits behind the note at low opacity so the words run over it, rather than
   being punctuation the reader has to step around. Only the opening mark: the
   panel already ends the quote, so a closing one just adds clutter. */
.gh-portal-gift-email-message-mark {
    position: absolute;
    /* Anchored off the panel's top-left corner and clipped by it, so what
       shows is the lower part of the mark running into the corner rather than
       a whole glyph parked inside the box. */
    top: -22px;
    inset-inline-start: -10px;
    width: 98px;
    height: auto;
    color: var(--brandcolor);
    opacity: 0.04;
    pointer-events: none;
}

.gh-portal-gift-email-message-text {
    position: relative;
    margin: 0;
    color: #15212A;
    font-size: 1.55rem;
    font-style: italic;
    line-height: 1.5;
    white-space: pre-line;
    word-break: break-word;
}

.gh-portal-gift-email-benefits {
    margin-top: 24px;
}

/* The template's small uppercase "What's included" heading. */
/* Sentence case, normal weight, body colour, and the same size as the perks it
   introduces. Uppercased and semibold it was the heaviest thing on the sheet,
   and at its own size it read as a third kind of type in a short list. */
.gh-portal-gift-email-benefits-label {
    margin: 0 0 6px;
    color: #3A464C;
    font-size: 1.55rem;
    font-weight: 400;
    line-height: 1.45;
}

.gh-portal-gift-email-benefit {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    padding: 5px 0;
    color: #3A464C;
    font-size: 1.55rem;
    line-height: 1.45;
}

.gh-portal-gift-email-benefit svg {
    flex-shrink: 0;
    width: 13px;
    height: 13px;
    margin-top: 4px;
}

/* The checkmark hard-codes its stroke, so it can't be themed via color. */
.gh-portal-gift-email-benefit svg path {
    stroke: var(--brandcolor);
}

.gh-portal-gift-checkout-card-stack[data-revealing="true"] .gh-portal-gift-checkout-card-frame {
    transform: rotate(3deg);
}

.gh-portal-gift-checkout-details-toggle {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    margin-top: 24px;
    padding: 8px 12px;
    background: transparent;
    border: none;
    color: rgba(255, 255, 255, 0.7);
    font-size: 1.4rem;
    font-weight: 500;
    cursor: pointer;
    transition: color 0.15s ease;
}

.gh-portal-gift-checkout-details-toggle:hover {
    color: rgba(255, 255, 255, 0.95);
}

.gh-portal-gift-checkout-details-toggle:focus-visible {
    outline: 2px solid rgba(255, 255, 255, 0.9);
    outline-offset: 3px;
    border-radius: 4px;
}

.gh-portal-gift-checkout-details-toggle svg {
    width: 12px;
    height: 12px;
    transition: transform 0.2s ease;
}

.gh-portal-gift-checkout-details-toggle.is-open svg {
    transform: rotate(-180deg);
}

.gh-portal-gift-checkout-details {
    width: 100%;
    display: grid;
    grid-template-rows: 0fr;
    transition: grid-template-rows 0.3s ease, margin-top 0.3s ease;
    margin-top: 0;
}

.gh-portal-gift-checkout-details[data-open="true"] {
    grid-template-rows: 1fr;
    margin-top: 32px;
}

.gh-portal-gift-checkout-details-inner {
    min-height: 0;
    overflow: hidden;
}

.gh-portal-gift-checkout-details-description {
    margin: 0 0 12px;
    font-size: 1.45rem;
    line-height: 1.4;
    color: rgba(255, 255, 255, 0.85);
}

.gh-portal-gift-checkout-details-description:last-child {
    margin-bottom: 0;
}

.gh-portal-gift-checkout-card {
    position: relative;
    width: 100%;
    max-width: 280px;
    aspect-ratio: 1 / 1.45;
    background:
        linear-gradient(var(--shine-angle, 243.43deg), rgba(255, 255, 255, 0) 3.94%, rgba(255, 255, 255, 0.31) 49.99%, rgba(255, 255, 255, 0) 95.16%),
        linear-gradient(0deg, rgba(255, 255, 255, 0.07), rgba(255, 255, 255, 0.07)),
        var(--brandcolor);
    border-radius: 24px;
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.4), 0 24px 48px rgba(var(--blackrgb), 0.08), 0 4px 12px rgba(var(--blackrgb), 0.04);
    display: flex;
    flex-direction: column;
    overflow: hidden;
    isolation: isolate;
    transform-style: preserve-3d;
    will-change: transform;
}

.gh-portal-gift-checkout-card::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-image: url("${giftCardOrbUrl}");
    background-size: 120% auto;
    background-position: -60% -180%;
    background-repeat: no-repeat;
    pointer-events: none;
    z-index: 0;
    opacity: 0.2;
}

.gh-portal-gift-checkout-card::after {
    content: '';
    position: absolute;
    inset: 0;
    background-image: url("${giftCardNoiseUrl}");
    background-size: 192px 192px;
    background-position: 50% 50%;
    background-repeat: repeat;
    pointer-events: none;
    z-index: 2;
    opacity: 0.1;
}

.gh-portal-gift-checkout-card > * {
    position: relative;
}

.gh-portal-gift-checkout-card-notch {
    position: absolute;
    top: 20px;
    left: 50%;
    width: 56px;
    height: 12px;
    border-radius: 12px;
    background: #000;
    background: color-mix(in srgb, var(--brandcolor) 65%, #000 35%);
    box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.4), 0 1px 0 rgba(255, 255, 255, 0.18);
    transform: translateX(-50%);
    pointer-events: none;
    z-index: 3;
}

/* Takes the card's slack so everything after it is bottom-aligned. The details
   block used to do this with margin-top: auto, which meant the publication
   lockup floated up to meet the tier whenever a card rendered without a sender
   or value — as the one in the email preview does. */
.gh-portal-gift-checkout-card-meta {
    flex: 1;
    padding: 56px 28px 0;
    z-index: 3;
}

.gh-portal-gift-checkout-card-duration {
    font-size: 2.8rem;
    font-weight: 600;
    color: var(--white);
    letter-spacing: -0.01em;
    line-height: 1.1;
}

.gh-portal-gift-checkout-card-tier {
    margin-top: 6px;
    font-size: 1.5rem;
    color: var(--white);
    line-height: 1.3;
    overflow-wrap: anywhere;
}

.gh-portal-gift-checkout-card-details {
    padding: 0 28px 24px;
    display: flex;
    flex-direction: column;
    gap: 8px;
    z-index: 3;
}

.gh-portal-gift-checkout-card-detail-label {
    font-size: 1.2rem;
    color: rgba(255, 255, 255, 0.8);
    margin-bottom: -5px;
}

.gh-portal-gift-checkout-card-detail-value {
    font-size: 1.3rem;
    font-weight: 500;
    color: var(--white);
    overflow-wrap: anywhere;
}

/* Backstop for a card with neither meta nor details to take up the slack; inert
   whenever the meta above is growing, since flex-grow leaves no free space for
   an auto margin to absorb. */
.gh-portal-gift-checkout-card-site {
    margin-top: auto;
    padding: 16px 28px;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
}

.gh-portal-gift-checkout-card-site::before {
    content: '';
    position: absolute;
    inset: 0;
    background: var(--white);
    z-index: 1;
}

.gh-portal-gift-checkout-card-site-icon {
    width: 22px;
    height: 22px;
    object-fit: cover;
    position: relative;
    z-index: 3;
}

.gh-portal-gift-checkout-card-site-name {
    font-size: 1.4rem;
    font-weight: 600;
    letter-spacing: -0.01em;
    color: var(--grey0);
    position: relative;
    z-index: 3;
}

@media (max-width: 880px) {
    .gh-portal-popup-container.full-size.gift,
    .gh-portal-popup-container.full-size.giftSuccess,
    .gh-portal-popup-container.full-size.giftRedemption {
        padding: 0 !important;
    }

    .gh-portal-gift-checkout {
        grid-template-columns: 1fr;
        min-height: 0;
    }

    .gh-portal-gift-checkout-right {
        order: -1;
        position: static;
        height: auto;
        padding: 0;
        overflow: visible;
    }

    /* Hide the card/email preview on mobile so that the gifting form is
       visible */
    .gh-portal-content.gift .gh-portal-gift-checkout-right {
        display: none;
    }

    /* Setting this back to the brand colour because without the brandcolour
       background the close button disappears on white. */
    .gh-portal-popup-container.full-size.gift .gh-portal-closeicon,
    .gh-portal-popup-container.full-size.gift .gh-portal-closeicon:hover {
        color: var(--brandcolor) !important;
    }

    .gh-portal-content.gift .gh-portal-closeicon-container {
        display: flex;
        align-items: center;
        height: 40px;
        top: 12px;
        right: 12px;
    }

    html[dir="rtl"] .gh-portal-content.gift .gh-portal-closeicon-container {
        right: unset;
        left: 12px;
    }

    .gh-portal-gift-checkout-right-panel {
        padding: 56px 24px 32px;
        border-radius: 0 0 32px 32px;
    }

    .gh-portal-gift-checkout-left {
        padding: 32px 24px 0;
    }

    .gh-portal-content.gift .gh-portal-btn-site-title-back {
        align-items: center;
        height: 40px;
        top: 12px;
        left: 24px;
    }

    html[dir="rtl"] .gh-portal-content.gift .gh-portal-btn-site-title-back {
        right: 24px;
        left: unset;
    }

    .gh-portal-content.gift .gh-portal-gift-checkout-left {
        padding-top: 64px;
    }

    /* Screens without a sticky CTA wrapper need their own bottom padding. */
    .gh-portal-content.giftSuccess .gh-portal-gift-checkout-left,
    .gh-portal-content.giftRedemption .gh-portal-gift-checkout-left {
        padding-bottom: 24px;
    }

    .gh-portal-gift-checkout-card,
    .gh-portal-gift-checkout-card-stack {
        max-width: 240px;
    }

    .gh-portal-gift-checkout-email-stack {
        max-width: min(400px, 100% - 32px);
    }

    .gh-portal-gift-checkout-cta-wrapper {
        position: sticky;
        bottom: 0;
        margin: 0;
        padding: 24px 0;
        background: linear-gradient(0deg, rgba(var(--whitergb), 1) 70%, rgba(var(--whitergb), 0) 100%);
    }
}

@media (max-width: 480px) {
    .gh-portal-gift-checkout-header .gh-portal-main-title {
        font-size: 2.6rem;
    }

    .gh-portal-gift-checkout-card-duration {
        font-size: 2rem;
    }
}
`;
