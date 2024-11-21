import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator, Button, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuShortcut, DropdownMenuTrigger, Heading, Icon, Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarMenu, SidebarMenuButton, SidebarMenuItem, Tabs, TabsContent, TabsList, TabsTrigger } from "@tryghost/shade";

const EmailTab = () => {
    return (
        <div className="flex">
            <Tabs orientation="vertical" defaultValue="sent" className="w-full flex">
                <div className="flex-1">
                    <TabsContent value="sent">
                        This uses a tab on the left which is semantically correct. We need to implement variants for top and right tabs.
                    </TabsContent>
                    <TabsContent value="opened">
                        Opened
                    </TabsContent>
                    <TabsContent value="clicked">
                        Clicked
                    </TabsContent>
                    <TabsContent value="unsubscribed">
                        Unsubscribed
                    </TabsContent>
                    <TabsContent value="feedback">
                        Feedback
                    </TabsContent>
                    <TabsContent value="spam">
                        Marked as spam
                    </TabsContent>
                    <TabsContent value="bounced">
                        Bounced
                    </TabsContent>
                </div>
                <TabsList className="w-48 flex flex-col justify-start h-auto">
                    <TabsTrigger value="sent">
                        Sent
                    </TabsTrigger>
                    <TabsTrigger value="opened">
                        Opened
                    </TabsTrigger>
                    <TabsTrigger value="clicked">
                        Clicked
                    </TabsTrigger>
                    <TabsTrigger value="unsubscribed">
                        Unsubscribed
                    </TabsTrigger>
                    <TabsTrigger value="feedback">
                        Feedback
                    </TabsTrigger>
                    <TabsTrigger value="spam">
                        Marked as spam
                    </TabsTrigger>
                    <TabsTrigger value="bounced">
                        Bounced
                    </TabsTrigger>
                </TabsList>
            </Tabs>
        </div>
    );
}

const EmailSidebar = () => {
    return (
        <div className="w-full grid grid-cols-5">
            <div className="col-span-4">
                This uses a `sidebar` component which is nicer but not as straightforward to use as tabs
            </div>
            <Sidebar collapsible="none" className="bg-transparent w-full">
                <SidebarContent>
                    <SidebarGroup className="border-b last:border-none">
                        <SidebarGroupContent className="gap-0">
                            <SidebarMenu>
                                <SidebarMenuItem>
                                    <SidebarMenuButton isActive>
                                        <span>Sent</span>
                                    </SidebarMenuButton>
                                    <SidebarMenuButton>
                                        <span>Opened</span>
                                    </SidebarMenuButton>
                                    <SidebarMenuButton>
                                        <span>Clicked</span>
                                    </SidebarMenuButton>
                                    <SidebarMenuButton>
                                        <span>Unsubscribed</span>
                                    </SidebarMenuButton>
                                    <SidebarMenuButton>
                                        <span>Feedback</span>
                                    </SidebarMenuButton>
                                    <SidebarMenuButton>
                                        <span>Marked as spam</span>
                                    </SidebarMenuButton>
                                    <SidebarMenuButton>
                                        <span>Bounced</span>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                            </SidebarMenu>
                        </SidebarGroupContent>
                    </SidebarGroup>
                </SidebarContent>
            </Sidebar>
        </div>
    );
}

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
            <Tabs className="mt-8" defaultValue="overview" variant="outline">
                <TabsList className="grid w-full grid-cols-5">
                    <TabsTrigger value="overview" className="justify-start">
                        Overview
                    </TabsTrigger>
                    <TabsTrigger value="email" className="justify-start">
                        Email
                    </TabsTrigger>
                    <TabsTrigger value="web" className="justify-start">
                        Web
                    </TabsTrigger>
                    <TabsTrigger value="comments" className="justify-start">
                        Comments
                    </TabsTrigger>
                    <TabsTrigger value="growth" className="justify-start">
                        Growth
                    </TabsTrigger>
                </TabsList>
                <TabsContent value="overview">
                    Overview
                </TabsContent>
                <TabsContent value="email">
                    <EmailTab />
                </TabsContent>
                <TabsContent value="web">
                    <EmailSidebar />
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