import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import CustomFieldFilterRenderer from './filter-renderer';
import type { FilterFieldConfig } from '@tryghost/shade/patterns';

vi.mock('@/shared/member-custom-fields/use-definitions', () => ({
  useCustomFieldDefinitionsIncludingArchived: () => ({
    data: [
      {
        namespace: 'custom',
        key: 'birthday',
        name: 'Birthday',
        type: 'short_text',
        status: 'active',
      },
      { namespace: 'custom', key: 'shipping', name: 'Shipping', type: 'address', status: 'active' },
    ],
  }),
}));

const PRESENCE_ONLY = [
  { value: 'is-set', label: 'is set' },
  { value: 'is-not-set', label: 'is not set' },
];

const TEXT_OPERATORS = [
  { value: 'is', label: 'is' },
  { value: 'is-not', label: 'is not' },
  { value: 'contains', label: 'contains' },
  { value: 'does-not-contain', label: 'does not contain' },
  { value: 'starts-with', label: 'starts with' },
  { value: 'ends-with', label: 'ends with' },
  ...PRESENCE_ONLY,
];

function renderPill({
  operators,
  defaultOperator,
  operator,
  onOperatorChange = () => {},
  fieldKey = 'metafields.custom.birthday',
  label = 'Birthday',
  values = ['', ''],
}: {
  operators: FilterFieldConfig['operators'];
  defaultOperator?: string;
  operator: string;
  onOperatorChange?: (operator: string) => void;
  fieldKey?: string;
  label?: string;
  values?: string[];
}) {
  return render(
    <CustomFieldFilterRenderer
      field={{
        key: fieldKey,
        label,
        operators,
        defaultOperator,
      }}
      operator={operator}
      values={values}
      onChange={() => {}}
      onOperatorChange={onOperatorChange}
    />,
  );
}

describe('CustomFieldFilterRenderer operators', () => {
  it('offers only the operators the field declares', async () => {
    renderPill({ operators: PRESENCE_ONLY, defaultOperator: 'is-set', operator: 'is-set' });

    fireEvent.pointerDown(screen.getByLabelText('Birthday operator'));
    await screen.findByRole('menu');

    expect(screen.getByRole('menuitem', { name: 'is set' })).toBeInTheDocument();
    expect(screen.queryByRole('menuitem', { name: 'contains' })).not.toBeInTheDocument();
  });

  it('keeps an operator the field declares, even one outside the text vocabulary', () => {
    const onOperatorChange = vi.fn();
    renderPill({
      operators: [{ value: 'is-or-less', label: 'is on or before' }, ...PRESENCE_ONLY],
      defaultOperator: 'is-or-less',
      operator: 'is-or-less',
      onOperatorChange,
    });

    expect(onOperatorChange).not.toHaveBeenCalled();
  });

  it('coerces an undeclared operator to the field default', () => {
    const onOperatorChange = vi.fn();
    renderPill({
      operators: PRESENCE_ONLY,
      defaultOperator: 'is-set',
      operator: 'contains',
      onOperatorChange,
    });

    expect(onOperatorChange).toHaveBeenCalledWith('is-set');
  });

  it('still offers the full text vocabulary to a text field', async () => {
    const onOperatorChange = vi.fn();
    renderPill({
      operators: TEXT_OPERATORS,
      defaultOperator: 'contains',
      operator: 'contains',
      onOperatorChange,
    });

    expect(onOperatorChange).not.toHaveBeenCalled();
    fireEvent.pointerDown(screen.getByLabelText('Birthday operator'));
    await screen.findByRole('menu');
    expect(screen.getByRole('menuitem', { name: 'contains' })).toBeInTheDocument();
  });

  it('narrows a whole composite to presence, and opens up once a part is chosen', async () => {
    const whole = renderPill({
      operators: TEXT_OPERATORS,
      defaultOperator: 'is-set',
      operator: 'is-set',
      fieldKey: 'metafields.custom.shipping',
      label: 'Shipping',
    });

    fireEvent.pointerDown(screen.getByLabelText('Shipping operator'));
    await screen.findByRole('menu');
    expect(screen.getByRole('menuitem', { name: 'is set' })).toBeInTheDocument();
    expect(screen.queryByRole('menuitem', { name: 'contains' })).not.toBeInTheDocument();
    whole.unmount();

    renderPill({
      operators: TEXT_OPERATORS,
      defaultOperator: 'is-set',
      operator: 'contains',
      fieldKey: 'metafields.custom.shipping',
      label: 'Shipping',
      values: ['city', 'London'],
    });

    fireEvent.pointerDown(screen.getByLabelText('Shipping operator'));
    await screen.findByRole('menu');
    expect(screen.getByRole('menuitem', { name: 'contains' })).toBeInTheDocument();
  });
});
