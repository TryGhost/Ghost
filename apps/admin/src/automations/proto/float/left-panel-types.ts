import type {AutomationScenario} from '@/automations/proto/shared/mock';

// The left pane's props contract.
export interface LeftPanelProps {
    scenario: AutomationScenario;
    selectedMemberId: string | null;
    onSelectMember: (runId: string | null) => void;
    // Collapses the pane. The control sits at the far right of the pane's own
    // header row — it belongs to the pane it hides, rather than floating on the
    // canvas beside it.
    onCollapse?: () => void;
}
