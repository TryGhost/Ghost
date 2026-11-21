import { expect, it } from 'vitest';
import { page } from 'vitest/browser';
import { useState } from 'react';
import { renderInApp } from '@test-utils/acceptance';
import TagColorField from './tag-color-field';

function TagColorForm() {
  const [colors, setColors] = useState(['#FF0000']);
  return (
    <>
      <TagColorField
        value={colors[colors.length - 1]}
        onChange={(color) => setColors((current) => [...current, color])}
        onError={() => {}}
      />
      <output data-testid="saved-colors">{colors.join(' ')}</output>
    </>
  );
}

function dispatchPointer(target: HTMLElement, type: string, clientX: number, clientY: number) {
  target.dispatchEvent(
    new PointerEvent(type, { bubbles: true, cancelable: true, pointerId: 1, clientX, clientY }),
  );
}

it('keeps the last colour picked when the picker reports twice before a re-render', async () => {
  await renderInApp(<TagColorForm />);

  await page.getByRole('button', { name: 'Accent color picker' }).click();
  await expect.element(page.getByRole('textbox', { name: 'Hex color' })).toBeVisible();

  const gradient = document.querySelector<HTMLElement>('.cursor-crosshair');
  if (!gradient) {
    throw new Error('Colour picker gradient not found');
  }
  // A synthetic pointer can't be captured; the capture doesn't matter here.
  gradient.setPointerCapture = () => {};
  const rect = gradient.getBoundingClientRect();

  // Press in the middle, then drag back to the top-right corner, which is the starting red.
  // Both land in one task, so React renders once after both colours are reported.
  dispatchPointer(gradient, 'pointerdown', rect.left + rect.width / 2, rect.top + rect.height / 2);
  dispatchPointer(gradient, 'pointermove', rect.right + 5, rect.top - 5);

  // Both colours reach the form, so it ends on red rather than the colour in the middle.
  await expect
    .element(page.getByTestId('saved-colors'))
    .toHaveTextContent('#FF0000 #8F3030 #FF0000');
  await expect
    .element(page.getByRole('textbox', { name: 'Accent color hex value' }))
    .toHaveValue('FF0000');
});
