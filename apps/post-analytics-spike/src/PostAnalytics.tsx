import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator, Button, Heading, Icon } from "@tryghost/shade";

const PostAnalytics = () => {
    return (
        // The div below should be converted into an app container component in the design system
        <div className="p-8 pt-9">

            {/* Should this `header` become a component? DRY */}
            <header>
                <Breadcrumb>
                    <BreadcrumbList>
                        <BreadcrumbItem>
                            <BreadcrumbLink href="/posts/">Posts</BreadcrumbLink>
                        </BreadcrumbItem>
                        <BreadcrumbSeparator />
                        <BreadcrumbPage>
                            Analytics
                        </BreadcrumbPage>
                    </BreadcrumbList>
                </Breadcrumb>
                <div className="flex items-start justify-between mt-2">
                    <Heading size="pagetitle">Post analytics</Heading>
                    <div className="flex items-center mt-1 gap-2">
                        <Button variant='outline'><Icon name="reload" /> Refresh</Button>
                        <Button variant='outline'><Icon name="share" /> Share</Button>
                        <Button variant='outline'><Icon name="ellipsis" /></Button>
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