import { GHDSBreadcrumb, GHDSBreadcrumbItem, GHDSBreadcrumbList, GHDSBreadcrumbLink, GHDSHeading, GHDSBreadcrumbPage, GHDSBreadcrumbSeparator, GHDSButton, Icon } from "@tryghost/phantom";

const PostAnalytics = () => {
    return (
        // The div below should be converted into an app container component in the design system
        <div className="p-8 pt-9">

            {/* Should this `header` become a component? DRY */}
            <header>
                <GHDSBreadcrumb>
                    <GHDSBreadcrumbList>
                        <GHDSBreadcrumbItem>
                            <GHDSBreadcrumbLink href="/posts/">Posts</GHDSBreadcrumbLink>
                        </GHDSBreadcrumbItem>
                        <GHDSBreadcrumbSeparator />
                        <GHDSBreadcrumbPage>
                            Analytics
                        </GHDSBreadcrumbPage>
                    </GHDSBreadcrumbList>
                </GHDSBreadcrumb>
                <div className="flex items-start justify-between">
                    <GHDSHeading size="pagetitle">Post analytics</GHDSHeading>
                    <div className="flex items-center mt-1 gap-2">
                        <GHDSButton variant='outline'><Icon name="reload" /> Refresh</GHDSButton>
                        <GHDSButton variant='outline'><Icon name="share" /> Share</GHDSButton>
                        <GHDSButton variant='outline'><Icon name="ellipsis" /></GHDSButton>
                    </div>
                </div>
            </header>
            <div className="mt-8 border rounded-lg border-grey-300 min-h-[500px] flex items-center justify-center text-grey-500">
                TK
            </div>
        </div>
    );
}

export default PostAnalytics;