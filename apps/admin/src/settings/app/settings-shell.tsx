import { type ComponentType, useEffect, useRef } from "react";
import { Button } from "@tryghost/shade/components";
import { LucideIcon } from "@tryghost/shade/utils";
import { Outlet, useLocation, useNavigate } from "@tryghost/admin-x-framework";
import { useCurrentUser } from "@tryghost/admin-x-framework/api/current-user";
import { canAccessSettings, isEditorUser } from "@tryghost/admin-x-framework/api/users";

import { AreaSection } from "./area-section";
import { type SettingsAreaId, resolveSettingsArea, useSettingsNav } from "./nav";
import { ScrollSpyProvider } from "./scroll-spy";
import { SettingsSidebar } from "./sidebar";
import { confirmIfDirty, useConfirmation } from "./shared/use-confirmation";
import { useSettingsDirty } from "./shared/use-settings-dirty";
import { AdvancedArea } from "@/settings/advanced/advanced-area";
import { EmailArea } from "@/settings/email/email-area";
import { GeneralArea } from "@/settings/general/general-area";
import { GrowthArea } from "@/settings/growth/growth-area";
import { MembershipArea } from "@/settings/membership/membership-area";
import { SiteArea } from "@/settings/site/site-area";
import { Users } from "@/settings/general/users";

/**
 * The native settings chrome: full-screen takeover with the nav sidebar on
 * the left and one scroll pane of area sections on the right, mirroring the
 * legacy layout (apps/admin-x-settings/src/main-content.tsx). Escape exits
 * settings when no modal is open; navigating to `/settings/:area` scrolls
 * the owning area section into view. Exits confirm first when a group has
 * unsaved changes.
 *
 * Role gating mirrors the legacy main-content: editors get a staff-only
 * view without the sidebar; contributors/authors get no settings content at
 * all — only their routed profile dialog renders.
 */

// Every area's native component, in the shape the nav model addresses them.
const AREA_COMPONENTS: Record<SettingsAreaId, ComponentType> = {
    general: GeneralArea,
    site: SiteArea,
    membership: MembershipArea,
    email: EmailArea,
    growth: GrowthArea,
    advanced: AdvancedArea,
};

// Shade/Radix dialogs expose their open state via dialog roles — when one is
// open, Escape belongs to the modal, not the exit-settings handler.
const OPEN_MODAL_SELECTOR = ':is([role="dialog"], [role="alertdialog"])[data-state="open"]';

/** The `/settings/:area` segment of the current location, or null on the index. */
function useCurrentSegment(): string | null {
    const { pathname } = useLocation();
    const match = /^\/settings\/([^/]+)/.exec(pathname);
    return match ? match[1] : null;
}

const EMPTY_KEYWORDS: string[] = [];

export function SettingsShell() {
    const navigate = useNavigate();
    const currentSegment = useCurrentSegment();
    const { groups, areas, isLoading } = useSettingsNav();
    const scrollerRef = useRef<HTMLDivElement | null>(null);
    const { isDirty } = useSettingsDirty();
    const { confirm } = useConfirmation();
    const { data: currentUser } = useCurrentUser();

    // Exit settings, confirming first when a group has unsaved changes (the
    // legacy useGlobalDirtyState/confirmIfDirty contract from main-content).
    const requestExit = () => {
        confirmIfDirty(confirm, isDirty, () => navigate("/"));
    };
    const requestExitRef = useRef(requestExit);
    requestExitRef.current = requestExit;

    // Escape exits settings when no modal is open. The sidebar's search field
    // stops propagation while it has a filter to clear, so this only fires
    // when Escape isn't already spoken for.
    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key !== "Escape") {
                return;
            }
            if (document.querySelector(OPEN_MODAL_SELECTOR)) {
                return;
            }
            requestExitRef.current();
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => {
            window.removeEventListener("keydown", handleKeyDown);
        };
    }, []);

    // Scroll the routed group's section into view (falling back to its
    // area) — on nav clicks and on deep links once the nav data has settled
    // the layout.
    useEffect(() => {
        if (!currentSegment) {
            return;
        }
        const areaId = resolveSettingsArea(currentSegment);
        if (!areaId) {
            return;
        }
        const scroller = scrollerRef.current;
        const target = scroller?.querySelector(`#${CSS.escape(currentSegment)}`)
            ?? scroller?.querySelector(`#settings-area-${areaId}`);
        target?.scrollIntoView();
    }, [currentSegment, isLoading]);

    // Wait for the current user before rendering any chrome — the legacy
    // GlobalDataProvider blocked rendering the same way, so role-gated
    // views never flash the full shell.
    if (!currentUser) {
        return null;
    }

    // Contributors/Authors only see their own profile dialog (routed).
    if (!canAccessSettings(currentUser)) {
        return <Outlet />;
    }

    // Editors get a staff-only settings view without the sidebar.
    if (isEditorUser(currentUser)) {
        return (
            <div className="flex size-full bg-background text-foreground">
                <div className="h-full flex-1 overflow-y-auto overscroll-y-contain">
                    <div className="mx-auto flex max-w-[760px] flex-col gap-12 px-14 pt-16 pb-[20vh]">
                        <h1 className="text-4xl font-bold tracking-tight">Settings</h1>
                        <Users keywords={EMPTY_KEYWORDS} />
                    </div>
                </div>
                <div className="fixed top-6 right-6 z-50">
                    <Button aria-label="Close settings" data-testid="exit-settings" size="icon" title="Close (ESC)" variant="ghost" onClick={requestExit}>
                        <LucideIcon.X className="size-5" />
                    </Button>
                </div>
                <Outlet />
            </div>
        );
    }

    return (
        <ScrollSpyProvider navigatedSection={currentSegment}>
            <div className="flex size-full bg-background text-foreground">
                <aside className="flex h-full w-[300px] shrink-0 flex-col overflow-y-auto overscroll-y-contain bg-sidebar px-6">
                    <SettingsSidebar
                        groups={groups}
                        onFilterScrollReset={() => scrollerRef.current?.scrollTo({ top: 0, left: 0 })}
                    />
                </aside>
                <div ref={scrollerRef} className="h-full flex-1 overflow-y-auto overscroll-y-contain">
                    <div className="mx-auto flex max-w-[760px] flex-col gap-12 px-14 pt-16 pb-[60vh]">
                        {areas.map((area) => (
                            <AreaSection key={area.id} area={area} Component={AREA_COMPONENTS[area.id]} />
                        ))}
                    </div>
                </div>
                <div className="fixed top-6 right-6 z-50">
                    <Button aria-label="Close settings" data-testid="exit-settings" size="icon" title="Close (ESC)" variant="ghost" onClick={requestExit}>
                        <LucideIcon.X className="size-5" />
                    </Button>
                </div>
                <Outlet />
            </div>
        </ScrollSpyProvider>
    );
}
