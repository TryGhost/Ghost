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
            <div className="flex flex-col items-stretch px-3 py-4 gap-5">
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
                <Button variant='outline' className="flex items-center justify-between text-gray-500 hover:text-gray-700 hover:bg-background hover:border-gray-300 text-base [&_svg]:stroke-2">
                    <div className="flex items-center gap-2">
                        <LucideIcon.Search />
                        Search
                    </div>
                    <Kbd className="text-muted-foreground">⌘K</Kbd>
                </Button>
            </div>
        </SidebarHeader>
    );
}

export default NavHeader;
