import React from 'react';
import { EditorGate } from './editor-gate';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

const { mockUseBrowseConfig } = vi.hoisted(() => ({
  mockUseBrowseConfig: vi.fn(),
}));

vi.mock('@tryghost/admin-x-framework/api/config', () => ({
  useBrowseConfig: mockUseBrowseConfig,
}));

// `useEmberFeatureFlag` is the ownership authority when Ember is present.
// Mirroring the real reader (window.EmberBridge, undefined without it) lets
// tests cover both the standalone config path and the integrated Ember path.
vi.mock('./ember-bridge', () => ({
  EmberFallback: () => React.createElement('div', { 'data-testid': 'ember-fallback' }),
  useEmberFeatureFlag: (flag: string) => {
    const stateBridge = window.EmberBridge?.state;
    if (!stateBridge?.isFeatureEnabled) {
      return undefined;
    }
    return stateBridge.isFeatureEnabled(flag) ?? null;
  },
}));

// Stand in for the real lazy screen module so the test asserts the wiring
// without pulling in the editor chunk.
vi.mock('./editor/editor-screen', () => ({
  default: () => React.createElement('div', { 'data-testid': 'react-editor' }),
}));

const configResult = (overrides: Record<string, unknown>) => ({
  data: undefined,
  isError: false,
  isLoading: false,
  ...overrides,
});

const withLabs = (labs: Record<string, unknown>) => configResult({ data: { config: { labs } } });

describe('EditorGate', () => {
  beforeEach(() => {
    mockUseBrowseConfig.mockReset();
    delete window.EmberBridge;
  });

  it('renders the Ember editor while the flag is off', () => {
    mockUseBrowseConfig.mockReturnValue(withLabs({ editorReact: false }));

    render(<EditorGate />);

    expect(screen.getByTestId('ember-fallback')).toBeInTheDocument();
  });

  it('renders the Ember editor when Ember reports the flag off', () => {
    mockUseBrowseConfig.mockReturnValue(withLabs({ editorReact: false }));
    window.EmberBridge = {
      state: {
        isFeatureEnabled: () => false,
      },
    } as unknown as typeof window.EmberBridge;

    render(<EditorGate />);

    expect(screen.getByTestId('ember-fallback')).toBeInTheDocument();
  });

  it('renders the Ember editor when the flag is absent', () => {
    mockUseBrowseConfig.mockReturnValue(withLabs({}));

    render(<EditorGate />);

    expect(screen.getByTestId('ember-fallback')).toBeInTheDocument();
  });

  it('renders the Ember editor when the config query fails', () => {
    mockUseBrowseConfig.mockReturnValue(configResult({ isError: true }));

    render(<EditorGate />);

    expect(screen.getByTestId('ember-fallback')).toBeInTheDocument();
  });

  it('renders nothing while config is loading', () => {
    mockUseBrowseConfig.mockReturnValue(configResult({ isLoading: true }));

    const { container } = render(<EditorGate />);

    expect(container).toBeEmptyDOMElement();
  });

  it('renders the React editor while the flag is on', async () => {
    mockUseBrowseConfig.mockReturnValue(withLabs({ editorReact: true }));

    render(<EditorGate />);

    await waitFor(() => {
      expect(screen.getByTestId('react-editor')).toBeInTheDocument();
    });
    expect(screen.queryByTestId('ember-fallback')).not.toBeInTheDocument();
  });
});
