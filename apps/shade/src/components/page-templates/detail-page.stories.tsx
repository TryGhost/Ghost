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
import {Card, CardContent, CardHeader, CardTitle} from '@/components/ui/card';
import {DetailPage} from '@/components/page-templates/detail-page';
import {PageHeader} from '@/components/patterns/page-header';

const meta = {
    title: 'Page Templates / Detail Page',
    component: DetailPage,
    tags: ['autodocs'],
    parameters: {
        layout: 'fullscreen',
        docs: {
            description: {
                component: `
DetailPage is the canonical recipe for a **Detail / Edit page** — the sibling of \`ListPage\` for screens that show or edit a single entity (member, post, newsletter, etc.).

- Outer container is a vertical flex stack with the same horizontal padding as \`ListPage\` (\`px-4 lg:px-6\`) so a detail screen visually aligns with the list it was navigated in from.
- \`<DetailPage.Header>\` — non-sticky header band. Use \`PageHeader\` with \`sticky={false} blurredBackground={false}\` for the breadcrumb and actions.
- \`<DetailPage.Body>\` — scroll container that grows to fill.

\`\`\`tsx
<DetailPage>
  <DetailPage.Header>
    <PageHeader blurredBackground={false} sticky={false}>
      <PageHeader.Left>
        <PageHeader.Breadcrumb>…</PageHeader.Breadcrumb>
      </PageHeader.Left>
      <PageHeader.Actions>
        <PageHeader.ActionGroup>
          <Button>Save</Button>
        </PageHeader.ActionGroup>
      </PageHeader.Actions>
    </PageHeader>
  </DetailPage.Header>
  <DetailPage.Body>…</DetailPage.Body>
</DetailPage>
\`\`\`
                `
            }
        }
    }
} satisfies Meta<typeof DetailPage>;

export default meta;
type Story = StoryObj<typeof DetailPage>;

export const Structure: Story = {
    render: () => (
        <div className="h-screen">
            <DetailPage>
                <DetailPage.Header>
                    <PageHeader blurredBackground={false} sticky={false}>
                        <PageHeader.Left>
                            <PageHeader.Breadcrumb>
                                <Breadcrumb>
                                    <BreadcrumbList>
                                        <BreadcrumbItem>
                                            <BreadcrumbLink href="#">Members</BreadcrumbLink>
                                        </BreadcrumbItem>
                                        <BreadcrumbSeparator />
                                        <BreadcrumbItem>
                                            <BreadcrumbPage>Ada Lovelace</BreadcrumbPage>
                                        </BreadcrumbItem>
                                    </BreadcrumbList>
                                </Breadcrumb>
                            </PageHeader.Breadcrumb>
                        </PageHeader.Left>
                        <PageHeader.Actions>
                            <PageHeader.ActionGroup>
                                <Button>Save</Button>
                            </PageHeader.ActionGroup>
                        </PageHeader.Actions>
                    </PageHeader>
                </DetailPage.Header>
                <DetailPage.Body>
                    <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
                        <aside className="w-full shrink-0 lg:w-72">
                            <p className="text-muted-foreground">Sidebar</p>
                        </aside>
                        <div className="flex min-w-0 flex-1 flex-col gap-6">
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-base">Section</CardTitle>
                                </CardHeader>
                                <CardContent>Main content goes here.</CardContent>
                            </Card>
                        </div>
                    </div>
                </DetailPage.Body>
            </DetailPage>
        </div>
    )
};
