import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator, Button, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuShortcut, DropdownMenuTrigger, Heading, Icon, Tabs, TabsContent, TabsList, TabsTrigger } from "@tryghost/shade";

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
                        <Button variant='outline'><Icon name="share" /> Share</Button>
                        <DropdownMenu>
                            <DropdownMenuTrigger>
                                <Button variant="outline"><Icon name="ellipsis" /></Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="min-w-48">
                                <DropdownMenuItem>
                                    <span>Edit post</span>
                                    <DropdownMenuShortcut>⇧⌘E</DropdownMenuShortcut>
                                </DropdownMenuItem>
                                <DropdownMenuItem>
                                    <span>View in browser</span>
                                    <DropdownMenuShortcut>⇧⌘O</DropdownMenuShortcut>
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem className="text-red">Delete</DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>
            </header>
            <Tabs className="mt-8" defaultValue="overview">
                <TabsList className="grid w-full grid-cols-5">
                    <TabsTrigger value="overview">
                        Overview
                    </TabsTrigger>
                    <TabsTrigger value="email">
                        Email
                    </TabsTrigger>
                    <TabsTrigger value="web">
                        Web
                    </TabsTrigger>
                    <TabsTrigger value="comments">
                        Comments
                    </TabsTrigger>
                    <TabsTrigger value="growth">
                        Growth
                    </TabsTrigger>
                </TabsList>
                <TabsContent value="overview">
                    Overview
                </TabsContent>
                <TabsContent value="email">
                    Email
                </TabsContent>
                <TabsContent value="web">
                    Web
                </TabsContent>
                <TabsContent value="comments">
                    Comments
                </TabsContent>
                <TabsContent value="growth">
                    Growth
                </TabsContent>
            </Tabs>
        </div>
    );
}

export default PostAnalytics;