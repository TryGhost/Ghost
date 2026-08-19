import type React from 'react';
import type {ProtoSlot} from '@/automations/proto/shared/proto-variants';
import type {LeftPanelProps} from './types';
import {CanvasSidePanel} from '@/automations/proto/float/panels';
import {LeftPanelVariantB} from './variant-b';
import {LeftPanelVariantC} from './variant-c';

export type {LeftPanelProps} from './types';

// Registry pairing each left-panel variant id with its component. To add a
// variation: create a file beside this one rendering LeftPanelProps, then list
// it here — the switcher picks up the label via LEFT_PANEL_SLOT automatically.
// The original docked panel (panels.tsx) stays where it is and rides along as
// Variant A. Order matters: the first entry is what fresh visitors see
// (resolveVariantId falls back to it), so the chosen default leads the list.
const VARIANTS: {id: string; label: string; component: React.FC<LeftPanelProps>}[] = [
    {id: 'variant-b', label: 'Variant B — simplified', component: LeftPanelVariantB},
    {id: 'performance', label: 'Variant A — four statuses', component: CanvasSidePanel},
    {id: 'variant-c', label: 'Variant C — status leads', component: LeftPanelVariantC}
];

export const LEFT_PANEL_SLOT: ProtoSlot = {
    id: 'left-panel',
    label: 'Left panel',
    variants: VARIANTS.map(({id, label}) => ({id, label}))
};

export const leftPanelComponent = (variantId: string): React.FC<LeftPanelProps> => (VARIANTS.find(variant => variant.id === variantId) ?? VARIANTS[0]).component;
