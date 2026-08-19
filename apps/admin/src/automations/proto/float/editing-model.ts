import type {ProtoSlot} from '@/automations/proto/shared/proto-variants';

// The screen's second variant slot: how editing works at all.
//
// 'explicit' — the current model. A separate edit mode you enter and leave, which
//   takes the left pane with it (edit gets the full width; reading gets the pane).
//
// 'always' — no edit mode. The canvas is always editable, and whether the left
//   pane is showing becomes the user's call via a collapse toggle rather than a
//   side effect of which mode they're in. That's what makes the mode removable:
//   the only thing edit mode was really buying was a full-width canvas, and a
//   collapse toggle buys that directly without a mode to be in.
//
//   Selecting a member still swaps to the read-only run view, so "always editable"
//   never fights "I'm reviewing what happened to someone" — the read canvas earns
//   its place by being about a member rather than about permissions.
export const EDITING_MODEL_SLOT: ProtoSlot = {
    id: 'editing-model',
    label: 'Editing',
    // First entry is the default for fresh visitors.
    variants: [
        {id: 'always', label: 'Always editable'},
        {id: 'explicit', label: 'Explicit edit mode'}
    ]
};
