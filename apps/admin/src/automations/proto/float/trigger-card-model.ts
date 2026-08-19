import type {ProtoSlot} from '@/automations/proto/shared/proto-variants';

// The screen's fourth variant slot: whether the trigger card is editable.
//
// 'editable' — the current card: pick a trigger, and the tier chips disclose
//   for the paid one.
//
// 'locked' — the phase-1 reality: the trigger is fixed once the automation
//   exists. The select stays visible but disabled (the card still says what
//   starts the flow), the conditional tier fields don't render, and a lock
//   button sits in the header's action slot — where the other cards put their
//   overflow menu — opening a popover that says why nothing here responds.
export const TRIGGER_CARD_SLOT: ProtoSlot = {
    id: 'trigger-card',
    label: 'Trigger card',
    // First entry is the default for fresh visitors.
    variants: [
        {id: 'locked', label: 'Locked (phase 1)'},
        {id: 'editable', label: 'Editable'}
    ]
};
