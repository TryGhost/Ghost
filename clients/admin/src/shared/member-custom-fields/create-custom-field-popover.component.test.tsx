import { describe, expect, it, vi } from 'vitest';
import { page } from 'vitest/browser';
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
});
