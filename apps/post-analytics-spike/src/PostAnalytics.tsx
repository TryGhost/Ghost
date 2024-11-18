import { GHDSBreadcrumb, GHDSBreadcrumbItem, GHDSBreadcrumbList, GHDSBreadcrumbLink, GHDSHeading, GHDSBreadcrumbPage, GHDSBreadcrumbSeparator, GHDSButton } from "@tryghost/admin-x-design-system";

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
                    <GHDSHeading size={1}>Post analytics</GHDSHeading>
                    <GHDSButton size={'sm'} className="mt-1">It is something!</GHDSButton>
                </div>
            </header>
            <div className="mt-8 border rounded-lg border-grey-300 min-h-[500px] flex items-center justify-center text-grey-500">
                TK
            </div>
        </div>
    );
}

export default PostAnalytics;