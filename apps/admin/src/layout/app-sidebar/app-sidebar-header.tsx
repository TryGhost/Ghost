import React from "react"
import {Badge, Button, Kbd, SidebarHeader} from "@tryghost/shade/components"
import {LucideIcon} from "@tryghost/shade/utils"
import {getSettingValue, useBrowseSettings} from "@tryghost/admin-x-framework/api/settings";
import { useBrowseSite } from "@tryghost/admin-x-framework/api/site";
import { useCurrentUser } from "@tryghost/admin-x-framework/api/current-user";
import { isContributorUser } from "@tryghost/admin-x-framework/api/users";

const ctrlOrCmd = navigator.userAgent.indexOf('Mac') !== -1 ? 'command' : 'ctrl';
const searchShortcut = ctrlOrCmd === 'command' ? '⌘K' : 'Ctrl+K';

// Search is currently handled by the Ember app, firing a keyboard event avoids needing to sync state
const openSearchModal = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    const searchShortcutEvent = new KeyboardEvent('keydown', {
        key: 'k',
        keyCode: 75, // Ember uses keymaster.js which still uses keyCode
        metaKey: ctrlOrCmd === 'command',
        ctrlKey: ctrlOrCmd === 'ctrl'
    });
    document.dispatchEvent(searchShortcutEvent);
}

function AppSidebarHeader({ ...props }: React.ComponentProps<typeof SidebarHeader>) {
    const { data: currentUser } = useCurrentUser();
    const site = useBrowseSite();
    const settings = useBrowseSettings();
    const title = site.data?.site.title ?? "";
    const siteIcon = site.data?.site.icon ?? "https://static.ghost.org/v4.0.0/images/ghost-orb-1.png";
    const isPrivate = getSettingValue<boolean>(settings.data?.settings, "is_private") ?? false;
    const showSearch = currentUser && !isContributorUser(currentUser);

    return (
        <SidebarHeader {...props}>
            <div className="flex flex-col items-stretch gap-6">
                <div className="flex items-center justify-between">
                    <div className="flex min-w-0 items-center gap-3">
                        <div className="h-8 w-8 flex-shrink-0 rounded-md border-0 bg-transparent">
                            <img
                                src={siteIcon}
                                alt="Site icon"
                                className="h-full w-full rounded-md object-cover"
                                />
                        </div>
                        <div className="flex min-w-0 flex-1 items-center gap-2">
                            <div className="min-w-0 overflow-hidden text-[15px] font-semibold text-ellipsis whitespace-nowrap text-foreground">
                                {title}
                            </div>
                            {isPrivate && (
                                <a aria-label="Open access settings" className="shrink-0" href="#/settings/members">
                                    <Badge className="gap-1 border-transparent bg-orange-100 px-1.5 py-0 text-[11px] leading-5 font-semibold text-orange-700 transition-colors hover:bg-orange-200 dark:bg-orange-500/20 dark:text-orange-300 dark:hover:bg-orange-500/30" variant="secondary">
                                        <LucideIcon.Lock className="size-3" strokeWidth={2.25} />
                                        Private
                                    </Badge>
                                </a>
                            )}
                        </div>
                    </div>
                </div>
                {showSearch && (
                    <Button
                        variant="outline"
                        className="flex h-[38px] items-center justify-between pr-2 text-base text-muted-foreground shadow-xs hover:border-gray-200 hover:bg-background hover:text-gray-700 hover:shadow-sm dark:bg-gray-950 dark:hover:border-gray-800 [&_svg]:stroke-2"
                        onClick={openSearchModal}
                    >
                        <div className="flex items-center gap-2">
                            <LucideIcon.Search className="text-muted-foreground" />
                            Search site
                        </div>
                        <Kbd className="bg-transparent text-gray-500 shadow-none dark:text-gray-800" style={{textShadow: 'none'}}>{searchShortcut}</Kbd>
                    </Button>
                )}
            </div>
        </SidebarHeader>
    );
}

export default AppSidebarHeader;
