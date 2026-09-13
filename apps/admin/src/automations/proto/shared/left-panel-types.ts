import type { AutomationScenario } from '@/automations/proto/shared/mock';

// The left pane's props contract, shared by every lane. Anything a single
// lane's pane needs goes on that lane's own component, not here.
export interface LeftPanelProps {
  scenario: AutomationScenario;
  selectedMemberId: string | null;
  onSelectMember: (runId: string | null) => void;
  // The member search term. Owned by the screen rather than the pane: the lanes
  // put the field in different places, so the value can't live in any one of them.
  query: string;
  onQueryChange: (query: string) => void;
}
