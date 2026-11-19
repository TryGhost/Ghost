import { describe, expect, it, vi } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { useRef } from 'react';

import { renderInApp } from '@test-utils/acceptance';
import { useCreatableMemberCustomFieldTypes } from '@tryghost/admin-x-framework/api/member-custom-fields';

import { CreateCustomFieldPopover } from '@/shared/member-custom-fields/create-custom-field-popover';
import type { CustomFieldValues } from '@/shared/member-custom-fields/custom-field-values';

/** The popover open under a button, as a place outside Settings opens it. */
function Harness({
  withVisibility,
  onSubmit,
}: {
  withVisibility?: boolean;
  onSubmit: (values: CustomFieldValues) => void;
}) {
  const anchor = useRef<HTMLButtonElement>(null);
  const types = useCreatableMemberCustomFieldTypes();
  return (
    <>
      <button ref={anchor} type="button">
        Field
      </button>
      <CreateCustomFieldPopover
        anchorRef={anchor}
        attempt={{ state: 'idle' }}
        initialName="Shipping Address"
        testId="create-custom-field"
        types={types}
        withVisibility={withVisibility}
        open
        onCancel={() => {}}
        onEdit={() => {}}
        onSubmit={onSubmit}
      />
    </>
  );
}

const form = () => page.getByRole('dialog', { name: 'New custom field' });

describe('CreateCustomFieldPopover', () => {
  it('makes a field staff-only without asking, by default', async () => {
    const onSubmit = vi.fn();
    await renderInApp(<Harness onSubmit={onSubmit} />);

    await expect.element(form().getByLabelText('Name')).toHaveValue('Shipping Address');
    await expect.element(form().getByLabelText('Visible to members')).not.toBeInTheDocument();
    await form().getByRole('button', { name: 'Save' }).click();

    await expect.poll(() => onSubmit.mock.calls.length).toBe(1);
    expect(onSubmit.mock.calls[0][0]).toMatchObject({ access: 'none' });
  });

  // A place that asks starts the field staff-only too, until the publisher opens it to members.
  it.each([
    ['staff-only', false, 'none'],
    ['open to members once the switch is on', true, 'write'],
  ])('asks who can see the field with `withVisibility`, making it %s', async (_, open, access) => {
    const onSubmit = vi.fn();
    await renderInApp(<Harness withVisibility onSubmit={onSubmit} />);

    const visible = form().getByLabelText('Visible to members');
    await expect.element(visible).toBeVisible();
    await expect.element(visible).not.toBeChecked();
    if (open) {
      await visible.click();
    }
    await form().getByRole('button', { name: 'Save' }).click();

    await expect.poll(() => onSubmit.mock.calls.length).toBe(1);
    expect(onSubmit.mock.calls[0][0]).toMatchObject({ access });
  });

  it('cancels a keyboard move of an option on Escape, and stays open with its options', async () => {
    await renderInApp(<Harness onSubmit={() => {}} />);

    await form().getByLabelText('Type').click();
    await page.getByRole('option', { name: /List/ }).click();
    for (const option of ['Dog', 'Cat', 'Fish']) {
      await form().getByLabelText('New option').fill(option);
      await userEvent.keyboard('{Enter}');
    }
    const options = () =>
      form()
        .getByLabelText(/^Option \d+$/)
        .elements()
        .map((input) => (input as HTMLInputElement).value);
    await expect.poll(options).toEqual(['Dog', 'Cat', 'Fish']);
    const announcements = () =>
      [...document.querySelectorAll('[role="status"][aria-live="assertive"]')].map(
        (region) => region.textContent,
      );

    (form().getByLabelText('Reorder Cat').element() as HTMLElement).focus();
    await userEvent.keyboard(' ');
    await expect.poll(announcements).toContain('Picked up Cat, position 2 of 3.');
    await userEvent.keyboard('{ArrowDown}');
    await expect.poll(announcements).toContain('Cat moved to position 3 of 3.');
    await userEvent.keyboard('{Escape}');
    await expect.poll(announcements).toContain('Moving cancelled. Cat stays at position 2 of 3.');

    await expect.poll(options).toEqual(['Dog', 'Cat', 'Fish']);
    await expect.element(form()).toBeVisible();
  });
});
