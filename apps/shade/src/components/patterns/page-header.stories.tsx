import type {Meta, StoryObj} from '@storybook/react-vite';
import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator
} from '@/components/ui/breadcrumb';
import {Button} from '@/components/ui/button';
import {DropdownMenuItem} from '@/components/ui/dropdown-menu';
import {InputGroup, InputGroupAddon, InputGroupInput} from '@/components/ui/input-group';
import {Navbar, NavbarNavigation} from '@/components/ui/navbar';
import {PageHeader} from './page-header';
import {PageMenu, PageMenuItem} from '@/components/ui/pagemenu';
import {Ellipsis, Filter, Gauge, Globe, Mail, Plus, Search, Share, Sprout} from 'lucide-react';

const meta = {
    title: 'Patterns / Page Header',
    component: PageHeader,
    tags: ['autodocs'],
    parameters: {
        layout: 'fullscreen'
    }
} satisfies Meta<typeof PageHeader>;

export default meta;
type Story = StoryObj<typeof PageHeader>;

export const ListPageShape: Story = {
    name: 'List page (Members)',
    args: {
        children: (
            <>
                <PageHeader.Left>
                    <PageHeader.Title>
                        Members
                        <PageHeader.Count>12,345</PageHeader.Count>
                    </PageHeader.Title>
                </PageHeader.Left>
                <PageHeader.Actions>
                    <PageHeader.ActionGroup>
                        <Button variant="outline">Import</Button>
                        <Button variant="outline">Export</Button>
                        <Button>Add member</Button>
                    </PageHeader.ActionGroup>
                </PageHeader.Actions>
            </>
        )
    }
};

export const ListPageWithBreadcrumb: Story = {
    name: 'List page with breadcrumb + description',
    args: {
        children: (
            <>
                <PageHeader.Left>
                    <PageHeader.Breadcrumb>
                        <Breadcrumb>
                            <BreadcrumbList>
                                <BreadcrumbItem>
                                    <BreadcrumbLink href="/">Home</BreadcrumbLink>
                                    <BreadcrumbSeparator />
                                    <BreadcrumbPage>Members</BreadcrumbPage>
                                </BreadcrumbItem>
                            </BreadcrumbList>
                        </Breadcrumb>
                    </PageHeader.Breadcrumb>
                    <PageHeader.Title>
                        Members
                        <PageHeader.Count>12,345</PageHeader.Count>
                    </PageHeader.Title>
                    <PageHeader.Description>Manage your members</PageHeader.Description>
                </PageHeader.Left>
                <PageHeader.Actions>
                    <PageHeader.ActionGroup>
                        <Button variant="outline">Import</Button>
                        <Button variant="outline">Export</Button>
                        <Button>Add member</Button>
                    </PageHeader.ActionGroup>
                </PageHeader.Actions>
            </>
        )
    }
};

export const ListPageMobileResponsive: Story = {
    name: 'List page (mobile responsive)',
    render: () => (
        <PageHeader>
            <PageHeader.Left>
                <PageHeader.Title>
                    Members
                    <PageHeader.Count>12,345</PageHeader.Count>
                </PageHeader.Title>
            </PageHeader.Left>
            <PageHeader.Actions>
                <PageHeader.ActionGroup mobileMenuBreakpoint={740}>
                    <InputGroup className="w-full sm:w-56">
                        <InputGroupInput placeholder="Search members..." type="search" />
                        <InputGroupAddon>
                            <Search className="size-4" />
                        </InputGroupAddon>
                    </InputGroup>
                    <Button className="justify-center" variant="outline">
                        <Filter className="size-4" />
                        Filter
                    </Button>
                    <PageHeader.ActionGroup.Primary>
                        <Button className="justify-center">
                            <Plus className="size-4" />
                            <span className='hidden sm:inline-block'>Add member</span>
                        </Button>
                    </PageHeader.ActionGroup.Primary>
                    <PageHeader.ActionGroup.MobileMenu>
                        <PageHeader.ActionGroup.MobileMenuTrigger>
                            <Button aria-label="Open members action menu" className="justify-center" size="icon" variant="outline">
                                <Ellipsis className="size-4" />
                            </Button>
                        </PageHeader.ActionGroup.MobileMenuTrigger>
                        <PageHeader.ActionGroup.MobileMenuContent className="w-72">
                            <div className="p-2">
                                <InputGroup className="w-full">
                                    <InputGroupInput placeholder="Search members..." type="search" />
                                    <InputGroupAddon>
                                        <Search className="size-4" />
                                    </InputGroupAddon>
                                </InputGroup>
                            </div>
                            <DropdownMenuItem>
                                <Filter className="size-4" />
                                Filter
                            </DropdownMenuItem>
                        </PageHeader.ActionGroup.MobileMenuContent>
                    </PageHeader.ActionGroup.MobileMenu>
                </PageHeader.ActionGroup>
            </PageHeader.Actions>
        </PageHeader>
    )
};

export const AnalyticsPageShape: Story = {
    name: 'Analytics page (Site Stats)',
    render: () => (
        <PageHeader>
            <PageHeader.Left>
                <PageHeader.Title>Analytics</PageHeader.Title>
            </PageHeader.Left>
            <PageHeader.Actions>
                <PageHeader.ContextStrip>
                    <Globe className="size-4 text-muted-foreground" />
                    <a className="text-sm font-medium" href="https://example.com">example.com</a>
                    <span className="text-border">|</span>
                    <span>1,234 online</span>
                    <span className="size-2 rounded-full bg-green-500" />
                </PageHeader.ContextStrip>
            </PageHeader.Actions>
            <PageHeader.Nav>
                <Navbar>
                    <NavbarNavigation>
                        <PageMenu defaultValue="/analytics/" responsive>
                            <PageMenuItem value="/analytics/">
                                <Gauge />
                                Overview
                            </PageMenuItem>
                            <PageMenuItem value="/analytics/web/">
                                <Globe />
                                Web traffic
                            </PageMenuItem>
                            <PageMenuItem value="/analytics/newsletters/">
                                <Mail />
                                Newsletters
                            </PageMenuItem>
                            <PageMenuItem value="/analytics/growth/">
                                <Sprout />
                                Growth
                            </PageMenuItem>
                        </PageMenu>
                    </NavbarNavigation>
                </Navbar>
            </PageHeader.Nav>
        </PageHeader>
    )
};

export const AnalyticsPageWithHero: Story = {
    name: 'Analytics page (Post Analytics)',
    render: () => (
        <PageHeader>
            <PageHeader.TopRow>
                <PageHeader.Breadcrumb>
                    <Breadcrumb>
                        <BreadcrumbList>
                            <BreadcrumbItem>
                                <BreadcrumbLink href="/analytics">Analytics</BreadcrumbLink>
                            </BreadcrumbItem>
                            <BreadcrumbSeparator />
                            <BreadcrumbItem>
                                <BreadcrumbPage>Post analytics</BreadcrumbPage>
                            </BreadcrumbItem>
                        </BreadcrumbList>
                    </Breadcrumb>
                </PageHeader.Breadcrumb>
                <PageHeader.ContextStrip>
                    <span>423 reading now</span>
                    <span className="size-2 rounded-full bg-green-500" />
                    <Button variant="outline">
                        <Share className="size-4" />
                        Share
                    </Button>
                    <Button size="icon" variant="outline">
                        <Ellipsis className="size-4" />
                    </Button>
                </PageHeader.ContextStrip>
            </PageHeader.TopRow>
            <PageHeader.Hero>
                <PageHeader.HeroImage src="https://images.unsplash.com/photo-1518770660439-4636190af475?w=400" />
                <PageHeader.HeroBody>
                    <PageHeader.Title>The future of independent publishing</PageHeader.Title>
                    <PageHeader.Meta>Published and sent on November 18, 2025 at 9:00 AM</PageHeader.Meta>
                </PageHeader.HeroBody>
            </PageHeader.Hero>
            <PageHeader.Nav>
                <Navbar>
                    <NavbarNavigation>
                        <PageMenu defaultValue="Overview" responsive>
                            <PageMenuItem value="Overview">
                                <Gauge />
                                Overview
                            </PageMenuItem>
                            <PageMenuItem value="Web">
                                <Globe />
                                Web traffic
                            </PageMenuItem>
                            <PageMenuItem value="Newsletter">
                                <Mail />
                                Newsletter
                            </PageMenuItem>
                            <PageMenuItem value="Growth">
                                <Sprout />
                                Growth
                            </PageMenuItem>
                        </PageMenu>
                    </NavbarNavigation>
                </Navbar>
            </PageHeader.Nav>
        </PageHeader>
    )
};
