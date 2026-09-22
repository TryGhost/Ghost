// Mock data for the automations dashboard concept.
//
// - Automation definitions use the real `AutomationDetail` shape (borrowed from
//   admin-x-framework), so they port to real API data 1:1.
// - Runs + metrics use net-new shapes we're designing (see ./types).
//
// Scenarios: member-welcome-email-free (healthy) and member-welcome-email-paid
// (steady state) — production's two real defaults, and the only automations a Ghost
// site has. The empty state is reached through emptyScenarioId rather than a fixture
// of its own.

export type {
  AutomationRun,
  AutomationRunMetrics,
  AutomationScenario,
  EnrollmentPoint,
  ExitReason,
  MetricKey,
  RunMember,
  RunStatus,
  RunStep,
  RunStepState,
} from './types';

export {
  AUTOMATION_DESCRIPTIONS,
  EMPTY_LEXICAL,
  PHASE_1_SLUGS,
  SEEDED_LEXICAL,
  getAutomation,
  mockAutomations,
} from './automations';
export { metricSeries } from './metric-series';
export { emptyScenarioId, getRunData } from './runs';
