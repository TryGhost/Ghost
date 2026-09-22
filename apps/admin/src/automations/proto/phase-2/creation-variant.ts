import type { ProtoSlot } from '@/automations/proto/shared/proto-variants';

// PHASE 2's creation slot — the open question of when an automation comes into
// being, kept switchable because the answer is genuinely undecided:
//
//   arrival   Create on arrival (the shipped-adjacent behaviour, and what a
//             team run-through previously chose): "New automation" inserts the
//             record and opens it. Kept in the slot so the comparison includes
//             the position being argued against, not just the challengers.
//   draft     Fake it until first save — eng thinks this may be possible.
//             Nothing exists until the header's Save or Publish; backing out
//             creates nothing. Full chrome from the start.
//   button    The fallback if draft doesn't survive contact with the backend:
//             the empty trigger card's options become selections with a
//             "Create automation" button beneath, and the header and canvas
//             HUD hold back until it's pressed.
//
// 'arrival' first: resolveVariantId falls back to the first variant, so the
// default anyone lands on is the behaviour closest to what's real today.
export const CREATION_SLOT: ProtoSlot = {
  id: 'phase2-creation',
  label: 'Creation',
  variants: [
    { id: 'arrival', label: 'Create on arrival' },
    { id: 'draft', label: 'Draft until save' },
    { id: 'button', label: 'Create button on trigger' },
  ],
};

// The sentinel id the deferred variants navigate to. The record's REAL id is
// minted by blankAutomation the moment the screen synthesizes its baseline —
// this is only what the URL says until the first commit swaps it out.
export const NEW_AUTOMATION_ID = 'new';
