import React from "react"
import {Button, Kbd, SidebarHeader} from "@tryghost/shade/components"
import {LucideIcon} from "@tryghost/shade/utils"
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
    const title = site.data?.site.title ?? "";
    const siteIcon = site.data?.site.icon ?? "https://static.ghost.org/v4.0.0/images/ghost-orb-1.png";
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
                        <div className="flex-1 overflow-hidden text-[15px] font-semibold text-ellipsis whitespace-nowrap text-foreground">
                            {title}
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
