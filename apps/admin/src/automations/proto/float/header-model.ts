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
//
// 'banner' — the docked bar again, with the unpublished-changes state rebuilt
//   around what it's for. Testing the bar turned up one consistent confusion: a
//   control reading "Unpublished changes" looks like something you're meant to
//   do, when all it does is report where the draft stands relative to what's
//   live. Buttons should be actions. So the header gains a primary "Publish
//   changes" — the action the state calls for — and beside it an alert button
//   that opens the review: what members are seeing meanwhile, what's in the
//   draft, and the choice to publish or discard it.
//
//   A banner on the canvas was tried in between and dropped: it spent the
//   canvas's own space to say one sentence, and translucent over a live flow it
//   was hard to read at all.
export const HEADER_SLOT: ProtoSlot = {
    id: 'header',
    label: 'Header',
    // First entry is the default for fresh visitors.
    variants: [
        {id: 'banner', label: 'Docked bar + changes alert'},
        {id: 'bar', label: 'Docked bar'},
        {id: 'floating', label: 'Floating chrome'}
    ]
};
