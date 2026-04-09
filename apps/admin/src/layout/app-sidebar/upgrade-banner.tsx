import {Banner, Button} from "@tryghost/shade/components"

import ghostProLogo from "@/assets/images/ghost-pro-logo.png";
import ghostProLogoDark from "@/assets/images/ghost-pro-logo-dark.png";

function UpgradeBanner({ trialDaysRemaining }: { trialDaysRemaining: number }) {
    return (
        <Banner variant='gradient' size='lg' className="mx-2 flex flex-col items-stretch">
            <div>
                <img src={ghostProLogo} alt="Ghost Pro" className="max-h-[33px] dark:hidden" />
                <img src={ghostProLogoDark} alt="Ghost Pro" className="hidden max-h-[33px] dark:block" />
            </div>
            <div className="mt-3 text-base font-semibold">Unlock every feature</div>
            <div className="mt-2 mb-4 text-sm text-gray-700">
                Choose a plan to access the full power of Ghost right away, you have <span className="font-semibold text-foreground">{trialDaysRemaining} days</span> free trial remaining.
            </div>
            <Button asChild><a href="#/pro/billing/plans">Upgrade now</a></Button>
        </Banner>
    )
}

export default UpgradeBanner;
