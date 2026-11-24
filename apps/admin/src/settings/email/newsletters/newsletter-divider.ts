// Prototype: divider style presets for the divider inside the post, shown only in the Admin
// preview. Nothing is saved, and the real email renderer has no styles for these yet.
// The lines between the post and the sections below it always stay thin.

export type DividerStyle = 'thin' | 'dots' | 'short';

export const DEFAULT_DIVIDER_STYLE: DividerStyle = 'thin';
