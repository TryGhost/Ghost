import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Tier } from '@tryghost/admin-x-framework/api/tiers';
import { TriggerCard } from './trigger-card';
import type { TriggerData } from './trigger-card';
import type { TierSelection } from '@/automations/types';
import { buildTriggerRules } from '@/automations/utils/trigger-rules';

const tier = (id: string, active: boolean, type = 'paid'): Tier => ({
  id,
  name: id,
  active,
  type,
  description: null,
  slug: id,
  welcome_page_url: null,
  created_at: '2024-01-01T00:00:00.000Z',
  updated_at: '2024-01-01T00:00:00.000Z',
  visibility: 'public',
  benefits: [],
  trial_days: 0,
});

const tiers = [
  tier('Gold', true),
  tier('Legacy', false),
  tier('Unused', false),
  tier('Free', true, 'free'),
];

function Picker({ initial }: { initial: TierSelection }) {
  const [rules, setRules] = useState<TriggerData['rules']>(() =>
    buildTriggerRules({ triggerType: 'paid_subscription_changed', selection: initial }),
  );
  return (
    <TriggerCard
      trigger={{
        tierQuery: {
          data: { tiers, isEnd: true },
          isLoading: false,
          isError: false,
          refetch: vi.fn<TriggerData['tierQuery']['refetch']>(),
        },
        triggerType: 'paid_subscription_changed',
        rules,
        savedTierIds: [],
        onUpdate: (trigger) => setRules(trigger.trigger_rules),
      }}
    />
  );
}

const open = (name: string) => fireEvent.click(screen.getByRole('combobox', { name }));
const options = () => screen.getAllByRole('option').map((row) => row.textContent);

const scrollIntoView = Object.getOwnPropertyDescriptor(Element.prototype, 'scrollIntoView');

beforeEach(() => {
  // jsdom lacks scrollIntoView, which the tier picker calls when its dropdown opens.
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

describe('Paid subscription changed tier choices', () => {
  it('offers archived sources but only active destinations', () => {
    render(<Picker initial={{ from: [], to: [] }} />);
    open('From');
    expect(options()).toEqual(['Any paid tier', 'Gold', 'Legacy (archived)', 'Unused (archived)']);
    fireEvent.click(screen.getByRole('option', { name: 'Legacy (archived)' }));
    fireEvent.keyDown(screen.getByRole('combobox', { name: 'From' }), { key: 'Escape' });
    expect(screen.getByRole('button', { name: 'Remove Legacy (archived)' })).toBeVisible();

    open('To');
    expect(options()).toEqual(['Free', 'Gold']);
  });

  it('keeps an existing archived destination visible and removable', () => {
    render(<Picker initial={{ from: 'any_paid', to: ['Legacy'] }} />);
    expect(screen.getByRole('button', { name: 'Remove Legacy (archived)' })).toBeVisible();
    open('To');
    expect(options()).toEqual(['Free', 'Gold', 'Legacy (archived)']);
    expect(screen.getByRole('option', { name: 'Legacy (archived)' })).toHaveAttribute(
      'aria-selected',
      'true',
    );

    fireEvent.click(screen.getByRole('button', { name: 'Remove Legacy (archived)' }));
    expect(options()).toEqual(['Free', 'Gold']);
  });

  it('removes an archived destination when chosen as a source', () => {
    render(<Picker initial={{ from: [], to: ['Legacy'] }} />);
    open('From');
    fireEvent.click(screen.getByRole('option', { name: 'Legacy (archived)' }));
    fireEvent.keyDown(screen.getByRole('combobox', { name: 'From' }), { key: 'Escape' });
    expect(screen.getByRole('combobox', { name: 'To' })).toHaveAttribute(
      'placeholder',
      'Select tiers...',
    );
    open('To');
    expect(options()).toEqual(['Free', 'Gold']);
  });
});
