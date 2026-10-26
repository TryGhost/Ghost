import { useSyncExternalStore } from 'react';

// SHAPING PROTOTYPE ONLY — never merge (see src/shaping/README.md).
//
// Which publisher the fake analytics data describes, picked in the prototype
// menu's Data size chips and remembered in this browser. No chip picked
// ("site") turns the fakes off, so the real screens show this site's own
// numbers. A change reloads the page,
// because the fake backend is installed before Admin starts.

export const SCENARIOS = [
  { id: 'site', label: 'Site data' },
  { id: 'empty', label: 'Empty' },
  { id: 'small', label: 'Small' },
  { id: 'medium', label: 'Mid' },
  { id: 'large', label: 'Large' },
] as const;

export type ScenarioId = (typeof SCENARIOS)[number]['id'];
export type FakeScenarioId = Exclude<ScenarioId, 'site'>;

const SCENARIO_KEY = 'shaping.analytics.scenario';
const DEFAULT_SCENARIO: ScenarioId = 'medium';

export const readScenario = (): ScenarioId => {
  try {
    const stored = localStorage.getItem(SCENARIO_KEY);
    return SCENARIOS.find((scenario) => scenario.id === stored)?.id ?? DEFAULT_SCENARIO;
  } catch {
    return DEFAULT_SCENARIO;
  }
};

export const setScenario = (scenario: ScenarioId) => {
  try {
    localStorage.setItem(SCENARIO_KEY, scenario);
  } catch {
    // Storage blocked: the reload keeps the current scenario.
  }
  window.location.reload();
};

// The patterns page always shows sample data; with the fakes off it shows the
// mid-sized publisher.
export const patternsScenario = (scenario: ScenarioId): FakeScenarioId =>
  scenario === 'site' ? 'medium' : scenario;

// Read once: a change reloads the page, so it can't change underneath.
const subscribe = () => () => {};
export const useScenario = () => useSyncExternalStore(subscribe, readScenario);
