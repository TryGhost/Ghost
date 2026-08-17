import React from 'react';
import {Stack, Text} from '@tryghost/shade/primitives';
import {LucideIcon} from '@tryghost/shade/utils';
import type {LeftPanelProps} from './types';

// Placeholder second variation — exists so the switcher demonstrably swaps the
// panel. Replace this file's body with the next left-panel design.
export const LeftPanelVariantB: React.FC<LeftPanelProps> = () => (
    <Stack align="center" className="h-full px-8 text-center" gap="sm" justify="center">
        <LucideIcon.FlaskConical className="size-6 text-muted-foreground" strokeWidth={1.5} />
        <Text weight="semibold">Variant B</Text>
        <Text size="sm" tone="secondary">A stub — swap in the next left-panel design here.</Text>
    </Stack>
);
