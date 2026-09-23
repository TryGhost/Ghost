import React from 'react';
import { type ButtonProps, LoadingIndicator } from '@tryghost/shade/components';

export type SaveStatus = 'idle' | 'pending' | 'success' | 'error';

/**
 * The header Save button's label and variant, mirroring the tag and member
 * detail screens: Save, a spinner while saving, Saved once clean, Retry on
 * failure.
 */
export function getSaveButtonState(
  status: SaveStatus,
  hasUnsavedChanges: boolean,
): { label: React.ReactNode; variant: ButtonProps['variant'] } {
  if (status === 'pending') {
    return {
      label: React.createElement(
        React.Fragment,
        null,
        React.createElement(LoadingIndicator, { size: 'sm' }),
        React.createElement('span', { className: 'sr-only' }, 'Saving'),
      ),
      variant: 'default',
    };
  }
  if (status === 'error') {
    return { label: 'Retry', variant: 'destructive' };
  }
  if (status === 'success' && !hasUnsavedChanges) {
    return { label: 'Saved', variant: 'default' };
  }
  return { label: 'Save', variant: 'default' };
}
