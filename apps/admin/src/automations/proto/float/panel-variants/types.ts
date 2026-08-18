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
    // Collapses the pane. Passed only by the editing model that can hide it, so
    // its absence is what tells a variant not to render the toggle at all. The
    // control sits at the far right of the variant's own header row — it belongs
    // to the pane it hides, rather than floating on the canvas beside it.
    onCollapse?: () => void;
    // True when the screen's chrome is a docked header bar rather than floating
    // overlays. The pane then owns its own top row — with a header above it there
    // is no screen strip to reach into, and its controls would otherwise sit on a
    // baseline that no longer exists.
    headerDocked?: boolean;
}
