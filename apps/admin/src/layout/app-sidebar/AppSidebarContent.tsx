import {
    SidebarContent,
} from "@tryghost/shade"

import NavMain from "./NavMain";
import NavContent from "./NavContent";
import NavGhostPro from "./NavGhostPro";
import NavSettings from "./NavSettings";

function AppSidebarContent() {
    return (
        <SidebarContent className="px-3 pt-4 justify-between">
            <div className="flex flex-col gap-2 sidebar:gap-4">
                <NavMain />
                <NavContent />
                <NavGhostPro />
            </div>
            <NavSettings className="pb-0" />
        </SidebarContent>
    )
}

export default AppSidebarContent;
