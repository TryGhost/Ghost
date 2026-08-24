// Mock data for the automations dashboard concept.
//
// - Automation definitions use the real `AutomationDetail` shape (borrowed from
//   admin-x-framework), so they port to real API data 1:1.
// - Runs + metrics use net-new shapes we're designing (see ./types).
//
// Scenarios: welcome-series (healthy), inactive-winback (early drop-off),
// paid-upgrade-nudge (steady state), cancellation-survey (empty / brand-new).

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
    RunStepState
} from './types';

export {AUTOMATION_DESCRIPTIONS, getAutomation, mockAutomations} from './automations';
export {metricSeries} from './metric-series';
export {emptyScenarioId, getScenario} from './runs';
