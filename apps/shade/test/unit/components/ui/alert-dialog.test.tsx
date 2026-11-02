import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';

import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../../../../src/components/ui/alert-dialog';
import { render } from '../../utils/test-utils';

describe('AlertDialog Components', () => {
  it('keeps footer actions content-sized', () => {
    render(
      <AlertDialog open>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm action</AlertDialogTitle>
            <AlertDialogDescription>Check the details before continuing.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter data-testid="alert-dialog-footer">
            <button type="button">Cancel</button>
            <button type="button">OK</button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>,
    );

    const footer = screen.getByTestId('alert-dialog-footer');

    expect(footer.className).not.toMatch(/\[&>button\]:min-w-20/);
  });
});
