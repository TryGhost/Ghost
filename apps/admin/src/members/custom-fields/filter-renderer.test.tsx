import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import CustomFieldFilterRenderer from './filter-renderer';
import type { FilterFieldConfig } from '@tryghost/shade/patterns';

// cmdk scrolls the highlighted option into view, which jsdom cannot do.
Element.prototype.scrollIntoView = () => {};

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

// What a composite with typed and picked parts declares: text, set, then presence.
const COMPOSITE_OPERATORS = [
  ...TEXT_OPERATORS.slice(0, -2),
  { value: 'is-any', label: 'is any of' },
  { value: 'is-not-any', label: 'is none of' },
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

  it('moves an undeclared operator to the first the field offers', () => {
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

  it('offers the country part the set operators, the way labels filter', async () => {
    renderPill({
      operators: COMPOSITE_OPERATORS,
      defaultOperator: 'is-set',
      operator: 'is-any',
      fieldKey: 'metafields.custom.shipping',
      label: 'Shipping',
      values: ['country'],
    });

    fireEvent.pointerDown(screen.getByLabelText('Shipping operator'));
    await screen.findByRole('menu');
    expect(screen.getByRole('menuitem', { name: 'is any of' })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'is none of' })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'is set' })).toBeInTheDocument();
    expect(screen.queryByRole('menuitem', { name: 'is' })).not.toBeInTheDocument();
    expect(screen.queryByRole('menuitem', { name: 'contains' })).not.toBeInTheDocument();
    expect(screen.queryByPlaceholderText('Enter value...')).not.toBeInTheDocument();
  });

  it('keeps the text operators for a typed part', async () => {
    renderPill({
      operators: COMPOSITE_OPERATORS,
      defaultOperator: 'is-set',
      operator: 'contains',
      fieldKey: 'metafields.custom.shipping',
      label: 'Shipping',
      values: ['city', 'London'],
    });

    fireEvent.pointerDown(screen.getByLabelText('Shipping operator'));
    await screen.findByRole('menu');
    expect(screen.getByRole('menuitem', { name: 'contains' })).toBeInTheDocument();
    expect(screen.queryByRole('menuitem', { name: 'is any of' })).not.toBeInTheDocument();
  });

  it('moves a text operator to "is any of" when the country part is chosen', () => {
    const onOperatorChange = vi.fn();
    renderPill({
      operators: COMPOSITE_OPERATORS,
      defaultOperator: 'is-set',
      operator: 'contains',
      onOperatorChange,
      fieldKey: 'metafields.custom.shipping',
      label: 'Shipping',
      values: ['country'],
    });

    expect(onOperatorChange).toHaveBeenCalledWith('is-any');
  });

  it('picks countries from a searchable list and keeps adding to the pick', async () => {
    const onChange = vi.fn();
    render(
      <CustomFieldFilterRenderer
        field={{
          key: 'metafields.custom.shipping',
          label: 'Shipping',
          operators: COMPOSITE_OPERATORS,
        }}
        operator="is-any"
        values={['country', 'DE']}
        onChange={onChange}
        onOperatorChange={() => {}}
      />,
    );

    expect(screen.getByLabelText('Shipping value')).toHaveTextContent('Germany');
    fireEvent.click(screen.getByLabelText('Shipping value'));
    await screen.findByRole('listbox');
    expect(screen.getByRole('option', { name: 'Congo - Kinshasa' })).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText('Search countries...'), {
      target: { value: 'united states' },
    });
    expect(screen.queryByRole('option', { name: 'Germany' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('option', { name: 'United States' }));
    expect(onChange).toHaveBeenCalledWith(['country', 'DE', 'US']);
  });

  it('sums up several chosen countries and still offers a stored code it cannot name', async () => {
    render(
      <CustomFieldFilterRenderer
        field={{
          key: 'metafields.custom.shipping',
          label: 'Shipping',
          operators: COMPOSITE_OPERATORS,
        }}
        operator="is-any"
        values={['country', 'DE', 'XX']}
        onChange={() => {}}
        onOperatorChange={() => {}}
      />,
    );

    expect(screen.getByLabelText('Shipping value')).toHaveTextContent('2 selected');
    fireEvent.click(screen.getByLabelText('Shipping value'));
    await screen.findByRole('listbox');
    expect(screen.getByRole('option', { name: 'XX' })).toBeInTheDocument();
  });

  it('drops the value when the new part is of another type', async () => {
    const onChange = vi.fn();
    const { unmount } = render(
      <CustomFieldFilterRenderer
        field={{
          key: 'metafields.custom.shipping',
          label: 'Shipping',
          operators: COMPOSITE_OPERATORS,
        }}
        operator="contains"
        values={['city', 'Berlin']}
        onChange={onChange}
        onOperatorChange={() => {}}
      />,
    );

    fireEvent.pointerDown(screen.getByLabelText('Shipping part'));
    await screen.findByRole('menu');
    fireEvent.click(screen.getByRole('menuitem', { name: 'Country' }));
    expect(onChange).toHaveBeenCalledWith(['country']);
    unmount();

    render(
      <CustomFieldFilterRenderer
        field={{
          key: 'metafields.custom.shipping',
          label: 'Shipping',
          operators: COMPOSITE_OPERATORS,
        }}
        operator="contains"
        values={['city', 'Berlin']}
        onChange={onChange}
        onOperatorChange={() => {}}
      />,
    );

    fireEvent.pointerDown(screen.getByLabelText('Shipping part'));
    await screen.findByRole('menu');
    fireEvent.click(screen.getByRole('menuitem', { name: 'Address line 1' }));
    expect(onChange).toHaveBeenCalledWith(['line1', 'Berlin']);
  });
});
