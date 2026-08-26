import type {AutomationScenario} from '@/automations/proto/shared/mock';

// The left pane's props contract.
export interface LeftPanelProps {
    scenario: AutomationScenario;
    selectedMemberId: string | null;
    onSelectMember: (runId: string | null) => void;
    // The member search term. Owned by the screen rather than the pane, because
    // Exploration puts the field in the header while phase 1 keeps it in the pane's
    // own strip — same filter, two homes, so the value can't live in either one.
    query: string;
    onQueryChange: (query: string) => void;
    // Hold the pane toggle's footprint open ahead of the title. The button itself
    // isn't ours — it's positioned on the row that holds both the pane and the
    // canvas, so it can stay put while the pane slides out from under it — but the
    // title still has to start where it would if the button were in flow here.
    reserveToggle?: boolean;
    // The pane is sitting on the page background rather than on its own elevated
    // surface. Only its sticky bar cares: that bar has to be opaque to occlude the
    // list scrolling under it, so it needs to name whatever is actually behind it.
    flat?: boolean;
}
