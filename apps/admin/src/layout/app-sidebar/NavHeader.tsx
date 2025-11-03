import React from "react"
import {
    Button,
    Kbd,
    LucideIcon,
    SidebarHeader
} from "@tryghost/shade"
import { useBrowseSite } from "@tryghost/admin-x-framework/api/site";

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

function NavHeader({ ...props }: React.ComponentProps<typeof SidebarHeader>) {
    const site = useBrowseSite();
    const title = site.data?.site.title ?? "";
    const siteIcon = site.data?.site.icon ?? "https://static.ghost.org/v4.0.0/images/ghost-orb-1.png";

    return (
        <SidebarHeader {...props}>
            <div className="flex flex-col items-stretch gap-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-md bg-transparent border-0 flex-shrink-0">
                            <img
                                src={siteIcon}
                                alt="Site icon"
                                className="w-full h-full rounded-md object-cover"
                                />
                        </div>
                        <div className="font-semibold text-[15px] text-black overflow-hidden text-ellipsis whitespace-nowrap">
                            {title}
                        </div>
                    </div>
                </div>
                <Button
                    variant="outline"
                    className="flex items-center justify-between text-gray-500 hover:text-gray-700 hover:bg-background text-base [&_svg]:stroke-2 pr-2 shadow-xs hover:shadow-sm hover:border-gray-200 h-[38px]"
                    onClick={openSearchModal}
                >
                    <div className="flex items-center gap-2">
                        <LucideIcon.Search className="text-muted-foreground" />
                        Search site
                    </div>
                    <Kbd className="text-gray-500 bg-transparent">{searchShortcut}</Kbd>
                </Button>
            </div>
        </SidebarHeader>
    );
}

export default NavHeader;
