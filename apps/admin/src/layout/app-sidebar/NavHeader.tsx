import React from "react"

import {
    Button,
    Kbd,
    LucideIcon,
    SidebarHeader
} from "@tryghost/shade"
import { useBrowseSite } from "@tryghost/admin-x-framework/api/site";

function NavHeader({ ...props }: React.ComponentProps<typeof SidebarHeader>) {
    const site = useBrowseSite();
    const title = site.data?.site.title ?? "";
    const logo = site.data?.site.logo ?? "https://static.ghost.org/v4.0.0/images/ghost-orb-1.png";

    return (
        <SidebarHeader {...props}>
            <div className="flex flex-col items-stretch gap-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-md bg-transparent border-0 flex-shrink-0">
                            <img
                                src={logo}
                                alt="Site icon"
                                className="w-full h-full rounded-md object-cover"
                                />
                        </div>
                        <div className="font-semibold text-[15px] text-black overflow-hidden text-ellipsis whitespace-nowrap">
                            {title}
                        </div>
                    </div>
                </div>
                <Button variant='outline' className="flex items-center justify-between text-gray-500 hover:text-gray-700 hover:bg-background text-base [&_svg]:stroke-2 pr-2 shadow-xs hover:shadow-sm hover:border-gray-200 h-[38px]">
                    <div className="flex items-center gap-2">
                        <LucideIcon.Search className="text-muted-foreground" />
                        Search site
                    </div>
                    <Kbd className="text-gray-500 bg-transparent">⌘K</Kbd>
                </Button>
            </div>
        </SidebarHeader>
    );
}

export default NavHeader;
