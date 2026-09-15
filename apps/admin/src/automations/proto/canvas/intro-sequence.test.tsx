import React, { StrictMode } from 'react';
import type { AutomationDetail } from '@tryghost/admin-x-framework/api/automations';
import type { TriggerConfig } from '@/automations/proto/shared/trigger-config';
import { EditCanvas, INTRO_GROWING_MS, INTRO_LEAVING_MS } from './edit-canvas';
import { ReactFlowProvider } from '@xyflow/react';
import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// React Flow measures its container; jsdom has no layout, so the observer just
// needs to exist. The sequence under test is driven by timers, not by size.
globalThis.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
} as unknown as typeof ResizeObserver;

const draft = {
  id: 'a',
  name: 'A',
  status: 'draft',
  actions: [],
  edges: [],
} as unknown as AutomationDetail;

const Harness: React.FC = () => {
  const [config, setConfig] = React.useState<TriggerConfig | null>(null);
  return (
    <ReactFlowProvider>
      <EditCanvas
        draft={draft}
        triggerConfig={config}
        onChange={() => {}}
        onTriggerConfigChange={setConfig}
      />
    </ReactFlowProvider>
  );
};

// The creation sequence is four beats long and almost impossible to eyeball —
// "it felt instant" is the same report whether the beats collapsed or the CSS
// simply wasn't running. This pins the beats so that question stays answerable.
//
// Under StrictMode deliberately, because the app runs under it and the sequence
// once failed ONLY there: it was started from a ref mutated during render, and
// StrictMode's discarded first pass kept the mutation while dropping the setState
// beside it, so the second pass concluded there was nothing to start.
describe('new automation intro sequence', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('holds the options, then the trigger alone, then connects the exit', () => {
    render(
      <StrictMode>
        <Harness />
      </StrictMode>,
    );
    act(() => {
      screen.getByText('Member signs up').closest('button')?.click();
    });

    // Leaving: the options are still on screen, fading. Nothing has been built
    // below the card yet. This is the beat that used to be skipped entirely,
    // painting the finished canvas for one frame.
    expect(screen.queryByText('Select a trigger')).not.toBeNull();
    expect(screen.queryByText('Exit automation')).toBeNull();

    // Growing: the fields have replaced the options and the card is resizing —
    // still alone, because everything below is positioned from its height.
    act(() => {
      vi.advanceTimersByTime(INTRO_LEAVING_MS + 10);
    });
    expect(screen.queryByText('Select a trigger')).toBeNull();
    expect(screen.queryByText('Exit automation')).toBeNull();

    // Connecting: the connector and the exit card exist at last.
    act(() => {
      vi.advanceTimersByTime(INTRO_GROWING_MS + 10);
    });
    expect(screen.queryByText('Exit automation')).not.toBeNull();
  });
});
