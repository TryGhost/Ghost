import type {AutomationScenario} from '@/automations/proto/shared/mock';

// The props contract every left-panel variant renders against. Lives in its
// own file so variant files and the registry can both import it without a
// cycle. Matches the original CanvasSidePanel's props (panels.tsx).
export interface LeftPanelProps {
    scenario: AutomationScenario;
    selectedMemberId: string | null;
    onSelectMember: (runId: string | null) => void;
    // Reported by variants whose search expands into the screen's top strip, where
    // it would otherwise collide with the floating automation title. The screen
    // hides the title while it's open; variants that don't do this never call it.
    onSearchOpenChange?: (open: boolean) => void;
}
