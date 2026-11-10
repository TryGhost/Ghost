import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ConditionCard } from './condition-card';
import type { ConditionData } from './condition-card';

const labels = [
  { id: 'magnet', name: 'November lead magnet' },
  { id: 'staff', name: 'Staff' },
];

const renderCard = (overrides: Partial<ConditionData> = {}, errorMessage?: string) => {
  const condition: ConditionData = {
    labelQuery: {
      labels,
      isLoading: false,
      isError: false,
      hasMore: false,
      loadMore: vi.fn<() => void>(),
      refetch: vi.fn<() => void>(),
    },
    operator: null,
    labelIds: [],
    onOperatorChange: vi.fn<ConditionData['onOperatorChange']>(),
    onLabelsChange: vi.fn<ConditionData['onLabelsChange']>(),
    ...overrides,
  };
  render(<ConditionCard condition={condition} errorMessage={errorMessage} menuItems={[]} />);
  return condition;
};

const scrollIntoView = Object.getOwnPropertyDescriptor(Element.prototype, 'scrollIntoView');

beforeEach(() => {
  // jsdom lacks scrollIntoView, which the label picker calls when its dropdown opens.
  Object.defineProperty(Element.prototype, 'scrollIntoView', {
    configurable: true,
    value: vi.fn(),
  });
});

afterEach(() => {
  cleanup();
  if (scrollIntoView) {
    Object.defineProperty(Element.prototype, 'scrollIntoView', scrollIntoView);
  } else {
    Reflect.deleteProperty(Element.prototype, 'scrollIntoView');
  }
});

describe('ConditionCard', () => {
  it('asks who can enter before it offers any labels', () => {
    renderCard();

    expect(screen.getByRole('combobox', { name: 'Who can enter this automation' })).toBeVisible();
    expect(screen.queryByRole('combobox', { name: 'Labels' })).not.toBeInTheDocument();
  });

  it.each([
    { operator: 'has_any', effect: /enters only if they have at least one of these labels/ },
    { operator: 'has_all', effect: /enters only if they have every one of these labels/ },
    { operator: 'has_none', effect: /with any of these labels does not enter/ },
  ] as const)('explains what $operator does once it is chosen', ({ operator, effect }) => {
    renderCard({ operator });

    expect(screen.getByRole('combobox', { name: 'Labels' })).toBeVisible();
    expect(screen.getByText(effect)).toBeVisible();
  });

  it('adds and removes labels', () => {
    const condition = renderCard({ operator: 'has_any', labelIds: ['staff'] });

    fireEvent.click(screen.getByRole('combobox', { name: 'Labels' }));
    fireEvent.click(screen.getByRole('option', { name: 'November lead magnet' }));
    expect(condition.onLabelsChange).toHaveBeenLastCalledWith(['staff', 'magnet']);

    fireEvent.click(screen.getByRole('button', { name: 'Remove Staff' }));
    expect(condition.onLabelsChange).toHaveBeenLastCalledWith([]);
  });

  it('shows why the condition cannot be saved yet', () => {
    renderCard({ operator: 'has_any' }, 'Choose who can enter and at least one label.');

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Choose who can enter and at least one label.',
    );
  });
});
