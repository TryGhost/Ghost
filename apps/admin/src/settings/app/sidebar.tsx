import { useEffect, useRef } from "react";
import { Badge, InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput, Kbd } from "@tryghost/shade/components";
import { LucideIcon, cn } from "@tryghost/shade/utils";
import { useNavigate } from "@tryghost/admin-x-framework";

import { type SettingsNavGroup, type SettingsNavItem } from "./nav";
import { useScrollSpy } from "./use-scroll-spy";
import { useSettingsSearch } from "./use-settings-search";

/**
 * Settings sidebar: keyword search + grouped navigation. Ports the legacy
 * sidebar's behavior contract (apps/admin-x-settings/src/components/
 * sidebar.tsx): search filters groups by keywords, `/` focuses the search
 * unless a text field has focus, Escape in a non-empty search blurs it
 * without bubbling to the shell's exit handler, clicking an item clears the
 * search and navigates to the item's legacy route segment. Highlighting is
 * scroll-spy driven (the group currently in view), like the legacy sidebar.
 */

interface SidebarProps {
    groups: SettingsNavGroup[];
    /** Scrolls the main pane back to the top when the filter changes. */
    onFilterScrollReset: () => void;
}

const PrivateBadge = () => (
    <Badge className="gap-1 px-1.5 py-0 text-[11px] leading-5 font-semibold" variant="secondary">
        <LucideIcon.Lock className="size-3" strokeWidth={2.25} />
        Private
    </Badge>
);

function NavItemButton({ item, onNavigate }: {
    item: SettingsNavItem;
    onNavigate: (item: SettingsNavItem) => void;
}) {
    const { checkVisible } = useSettingsSearch();
    const { currentSection } = useScrollSpy();
    const buttonRef = useRef<HTMLButtonElement | null>(null);
    const isCurrent = item.navids.includes(currentSection ?? "");

    // Keep the highlighted item visible in the sidebar's own scroll pane,
    // like the legacy scrollSidebarNav (no-op when already in view).
    useEffect(() => {
        if (isCurrent) {
            buttonRef.current?.scrollIntoView({ block: "nearest" });
        }
    }, [isCurrent]);

    if (!checkVisible(item.keywords)) {
        return null;
    }

    return (
        <button
            ref={buttonRef}
            aria-current={isCurrent ? "true" : undefined}
            className={cn(
                "flex h-9 w-full items-center justify-between gap-2 rounded-md px-3 text-left text-sm font-medium text-foreground transition-colors hover:bg-muted",
                isCurrent && "bg-muted"
            )}
            type="button"
            onClick={() => onNavigate(item)}
        >
            <span className="min-w-0 truncate">{item.title}</span>
            {item.showPrivateBadge && <PrivateBadge />}
        </button>
    );
}

export function SettingsSidebar({ groups, onFilterScrollReset }: SidebarProps) {
    const { filter, setFilter, checkVisible, noResult, setNoResult } = useSettingsSearch();
    const navigate = useNavigate();
    const searchInputRef = useRef<HTMLInputElement | null>(null);

    // Focus the search field when pressing "/" anywhere outside a text field.
    useEffect(() => {
        const handleKeyPress = (e: KeyboardEvent) => {
            if (e.target instanceof HTMLElement &&
                (e.target.nodeName === "INPUT" || e.target.nodeName === "TEXTAREA" || e.target.isContentEditable)) {
                return;
            }
            if (e.key === "/") {
                e.preventDefault();
                searchInputRef.current?.focus();
            }
        };
        window.addEventListener("keydown", handleKeyPress);
        return () => {
            window.removeEventListener("keydown", handleKeyPress);
        };
    }, []);

    // Auto-focus the search field on page load, mirroring legacy.
    useEffect(() => {
        searchInputRef.current?.focus();
    }, []);

    // Escape in a non-empty search blurs the field and stops the event from
    // reaching the shell's exit-settings handler; an empty search lets it
    // bubble so Escape still exits settings.
    useEffect(() => {
        const searchInput = searchInputRef.current;
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape" && filter) {
                searchInputRef.current?.blur();
                event.stopPropagation();
            }
        };
        searchInput?.addEventListener("keydown", handleKeyDown);
        return () => {
            searchInput?.removeEventListener("keydown", handleKeyDown);
        };
    }, [filter]);

    // Nothing-matched state: only flagged when every group misses the filter;
    // the main pane keeps all sections visible while it's set.
    useEffect(() => {
        const anyVisible = groups.some((group) => checkVisible(group.items.flatMap((item) => item.keywords)));
        setNoResult(!anyVisible);
    }, [groups, checkVisible, setNoResult, filter]);

    const handleNavigate = (item: SettingsNavItem) => {
        setFilter("");
        setNoResult(false);
        navigate(`/settings/${item.navids[0]}`);
    };

    const updateSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFilter(e.target.value);
        if (e.target.value) {
            onFilterScrollReset();
        }
    };

    return (
        <div className="flex h-full w-full flex-col" data-testid="sidebar">
            <div className="sticky top-0 z-10 bg-sidebar pt-6 pb-4">
                <InputGroup className="bg-surface-elevated">
                    <InputGroupAddon align="inline-start">
                        <LucideIcon.Search aria-hidden="true" className="size-4" />
                    </InputGroupAddon>
                    <InputGroupInput
                        ref={searchInputRef}
                        aria-label="Search settings"
                        autoComplete="off"
                        autoCorrect="off"
                        placeholder="Search settings"
                        value={filter}
                        onChange={updateSearch}
                    />
                    <InputGroupAddon align="inline-end">
                        {filter ? (
                            <InputGroupButton aria-label="Clear query" size="icon-xs" onClick={() => {
                                setFilter("");
                                searchInputRef.current?.focus();
                            }}>
                                <LucideIcon.X aria-hidden="true" />
                            </InputGroupButton>
                        ) : <Kbd>/</Kbd>}
                    </InputGroupAddon>
                </InputGroup>
            </div>
            <nav className="flex flex-col gap-6 pb-10">
                {noResult && (
                    <div className="px-3 text-sm text-muted-foreground">
                        <h2 className="mb-2 text-sm font-semibold text-foreground">No result</h2>
                        <div>
                            {`We couldn't find any setting matching '${filter}'.`}
                        </div>
                    </div>
                )}

                {groups.map((group) => {
                    const groupKeywords = group.items.flatMap((item) => item.keywords);
                    if (!checkVisible(groupKeywords)) {
                        return null;
                    }
                    return (
                        <div key={group.title}>
                            <h4 className="mb-1 px-3 text-xs font-semibold tracking-wide text-muted-foreground uppercase">{group.title}</h4>
                            <div className="flex flex-col">
                                {group.items.map((item) => (
                                    <NavItemButton
                                        key={item.navids[0]}
                                        item={item}
                                        onNavigate={handleNavigate}
                                    />
                                ))}
                            </div>
                        </div>
                    );
                })}
            </nav>
        </div>
    );
}
