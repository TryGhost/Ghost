import type {ProtoSlot} from '@/automations/proto/shared/proto-variants';

// The prototype's one variant slot: which release this screen is showing.
//
// It replaced a set of independent slots (left panel, header style, editing
// model, trigger card) whose combinations multiplied faster than they informed
// anything — most of the 36 they produced were incoherent, and the ones worth
// seeing were always a matched set. What a reviewer actually asks is "what ships
// first, and where does it go after", so that's the axis.
//
// 'phase-1' — what the first release covers. Editing works the way the shipping
//   editor already works: changes are held until you save or publish, and
//   leaving with unsaved work warns that it'll be lost. The trigger is fixed
//   once the automation exists, so its card renders locked. Chrome stays docked:
//   header, pane and canvas are three abutting surfaces separated by rules.
//
// 'future' (shown as "Exploration") — where it could go. Edits autosave into a draft, so the question
//   becomes which changes are live rather than whether they're saved, and the
//   header carries the unpublished-changes review. The trigger becomes editable.
//   Chrome flattens: header and pane sit unbordered on the page and the canvas
//   becomes an inset window, so the flow is the only bounded object on screen.
//
// Sub-slots can be registered alongside this one when a specific piece needs its
// own comparison (see proto-variants.ts) — the machinery never assumed a single
// slot. The point is that nothing gets a variant by default.
export const PHASE_SLOT: ProtoSlot = {
    id: 'phase',
    label: 'Release',
    // First entry is the default for fresh visitors.
    variants: [
        {id: 'phase-1', label: 'Phase 1'},
        // Labelled "Exploration", not "Future". The id stays 'future' because it's
        // internal and renaming it would only reset stored selections — but the label
        // is what a reviewer reads, and "Future" claimed a roadmap this hasn't got.
        // It reads as work already committed to and scheduled, which invites engineers
        // to cost it rather than react to it. "Exploration" says what it is.
        {id: 'future', label: 'Exploration'}
    ]
};
