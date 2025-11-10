import {
    Banner,
    Button,
    SidebarContent,
} from "@tryghost/shade"

import WhatsNewBanner from "@/whats-new/components/whats-new-banner";

import NavMain from "./NavMain";
import NavContent from "./NavContent";
import NavGhostPro from "./NavGhostPro";
import NavSettings from "./NavSettings";
import ghostProLogo from "@/assets/images/ghost-pro-logo.png";

function AppSidebarContent() {
    return (
        <SidebarContent className="px-3 pt-4 justify-between">
            <div className="flex flex-col gap-2 sidebar:gap-4">
                <NavMain />
                <NavContent />
                <NavGhostPro />
            </div>
            <div className="flex flex-col gap-2 sidebar:gap-4">
                <WhatsNewBanner />
                <Banner variant='gradient' size='lg' className="mx-5 my-2 flex flex-col items-stretch">
                    <div>
                        <img src={ghostProLogo} alt="Ghost Pro" className="max-h-[33px]" />
                    </div>
                    <div className="text-base mt-3 font-semibold">Unlock every feature</div>
                    <div className="mt-2 text-gray-700 text-sm mb-4">
                        Choose a plan to access the full power of Ghost right away, you have <span className="font-semibold text-black">3 days</span> free trial remaining.
                    </div>
                    <Button>Upgrade now</Button>
                </Banner>
                <NavSettings className="pb-0" />
            </div>
        </SidebarContent>
    )
}

export default AppSidebarContent;
