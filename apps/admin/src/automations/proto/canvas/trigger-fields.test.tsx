import { beforeAll, describe, expect, it } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { TriggerFieldsForm } from './trigger-config-form';
import {
  TRIGGER_OPTIONS,
  type TriggerType,
  triggerConfigFor,
  triggerHasField,
} from '@/automations/proto/shared/trigger-config';

// Every trigger that asks a question has to render the field that asks it.
//
// This exists because one didn't. The segment trigger shipped with a card that
// showed its sentence and no field: the canvas decided between the form and a
// plain explanation with a four-way `||`, the same list existed a second time
// for the field-reveal, and only one of them learned about the new trigger.
// Nothing caught it — typecheck was satisfied, and the tests of the day asserted
// the field's LABEL and its filter line without ever opening the thing.
//
// The list is one predicate now (triggerHasField), so the two readers can't
// disagree. This walks every trigger the proto knows, so the next one added is
// covered without anyone remembering to add a case.
const FIELD_LABELS: Partial<Record<TriggerType, string>> = {
  paid_subscription_starts: 'Triggered when someone signs up or upgrades to:',
  label_added: 'Triggered when someone signs up with:',
  paid_subscription_changed: "Triggered when a member's subscription:",
  segment_entered: 'Triggered when a member enters:',
};

describe('trigger fields', () => {
  // cmdk scrolls its active item into view on mount; jsdom has no such method.
  beforeAll(() => {
    Element.prototype.scrollIntoView = () => {};
  });

  for (const option of TRIGGER_OPTIONS) {
    const config = triggerConfigFor(option.value);
    if (!triggerHasField(config)) {
      continue;
    }

    it(`renders a field for ${option.value}`, () => {
      const expected = FIELD_LABELS[option.value];
      expect(expected, `no expected field label declared for ${option.value}`).toBeTruthy();
      render(<TriggerFieldsForm config={config} onChange={() => {}} />);
      expect(screen.getByText(expected as string)).toBeTruthy();
    });
  }

  it('offers the site’s segments when the field is opened', async () => {
    render(<TriggerFieldsForm config={triggerConfigFor('segment_entered')} onChange={() => {}} />);

    fireEvent.click(screen.getByLabelText('Search segments'));

    // The rows themselves, not just the field — an empty list was the visible
    // half of the same bug.
    const list = await screen.findByRole('listbox');
    expect(within(list).getByText('Engaged free members')).toBeTruthy();
    expect(within(list).getByText('At-risk paid members')).toBeTruthy();
  });

  it('keeps options in place when one is selected', async () => {
    // Shade's MultiSelectCombobox hoists the selected option into its own group
    // above the rest, which for a single-select means picking a row rearranges
    // the list you picked it from. The field renders its own rows to avoid it;
    // this is what says so.
    const chosen = { ...triggerConfigFor('segment_entered'), segmentId: 'at-risk' };
    render(<TriggerFieldsForm config={chosen} onChange={() => {}} />);
    fireEvent.click(screen.getByLabelText('Search segments'));

    const list = await screen.findByRole('listbox');
    const rows = within(list)
      .getAllByRole('option')
      .map((row) => row.textContent?.trim());

    // Source order — the selected 'At-risk paid members' is third and stays
    // third, rather than jumping above 'US readers over 30'.
    expect(rows).toEqual([
      'US readers over 30',
      'Engaged free members',
      'At-risk paid members',
      'Early supporters',
      // The standing create row, last and inside the list.
      'New segment',
    ]);
  });
  it('offers the new-segment row, disabled for now', async () => {
    // The builder behind this was removed — creating a segment means reusing the
    // members filtering experience, which is blocked on that catalog leaving the
    // members domain. The row stays so the demo still places creation here.
    let config = triggerConfigFor('segment_entered');
    render(
      <TriggerFieldsForm
        config={config}
        onChange={(next) => {
          config = next;
        }}
      />,
    );

    fireEvent.click(screen.getByLabelText('Search segments'));
    const row = within(await screen.findByRole('listbox'))
      .getByText('New segment')
      .closest('[cmdk-item]');

    expect(row?.getAttribute('data-disabled')).toBe('true');

    // And pressing it does nothing — no segment chosen, nothing raised.
    fireEvent.click(row as HTMLElement);
    expect(config.segmentId).toBeNull();
  });

  it('shows the new-segment row when a search matches nothing', async () => {
    render(<TriggerFieldsForm config={triggerConfigFor('segment_entered')} onChange={() => {}} />);
    fireEvent.click(screen.getByLabelText('Search segments'));
    fireEvent.change(screen.getByLabelText('Search segments'), {
      target: { value: 'zzzzz' },
    });
    await screen.findByRole('listbox');
    expect(screen.getByText('New segment')).toBeTruthy();
    // And not beside an empty state: the field only renders "No results found"
    // when there is genuinely nothing to press, create row included.
    expect(screen.queryByText('No results found')).toBeNull();
  });

  it('offers the site’s labels when the field is opened', async () => {
    render(<TriggerFieldsForm config={triggerConfigFor('label_added')} onChange={() => {}} />);

    fireEvent.click(screen.getByLabelText('Search labels'));

    const list = await screen.findByRole('listbox');
    expect(within(list).getByText('SEO guide')).toBeTruthy();
  });
});
