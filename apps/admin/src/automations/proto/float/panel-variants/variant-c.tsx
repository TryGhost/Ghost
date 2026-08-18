import React from 'react';
import type {LeftPanelProps} from './types';
import {LeftPanelBase} from './variant-b';

// Variant C: variant B with the run-status icon leading each member's name in a
// two-column table — status reads as a property of the person rather than a
// column you look across to, and the Member header sorts by status (name as the
// tie-break). Only early exits say anything in words: the reason follows the
// name ("Priya Nair unsubscribed"), because it's the one status where the glyph
// alone can't tell you what happened. All the behaviour lives in LeftPanelBase;
// this file exists so the variant registry has a component per id.
export const LeftPanelVariantC: React.FC<LeftPanelProps> = props => <LeftPanelBase {...props} statusLeads />;
