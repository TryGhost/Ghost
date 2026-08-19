import type {ProtoSlot} from '@/automations/proto/shared/proto-variants';

// The screen's third variant slot: what the chrome around the canvas is.
//
// 'floating' — the current model, and what "float" is named for. There is no
//   header; the title sits as an overlay at the top-left and the actions at the
//   top-right, both hovering directly on the canvas the way the post editor
//   floats its own controls over the document. The pane runs the full height and
//   its controls reach up into the screen's top strip to sit on the title's
//   baseline, so the top of the screen reads as one row.
//
// 'bar' — a docked full-width header instead: navigation at the left, the
//   automation centred with its status, the lifecycle action at the right, and
//   the pane and canvas both starting beneath it. Conventional rather than
//   novel, and that's the point of running it as a variant — the floating model
//   buys vertical space and a canvas that reads as the whole screen, while the
//   bar buys a title that can't collide with anything and a fixed home for
//   actions. Worth seeing side by side rather than arguing in the abstract.
//
//   It changes the pane as well as the chrome: with a header above it, the pane
//   can't borrow the screen's top strip, so it grows a header row of its own.
export const HEADER_SLOT: ProtoSlot = {
    id: 'header',
    label: 'Header',
    // First entry is the default for fresh visitors.
    variants: [
        {id: 'bar', label: 'Docked bar'},
        {id: 'floating', label: 'Floating chrome'}
    ]
};
