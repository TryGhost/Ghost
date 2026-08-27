import { useContext } from 'react';
import { useLocation } from '@tryghost/admin-x-framework';
import { Container, ErrorPage } from '@tryghost/shade/primitives';
import { PageHeader } from '@tryghost/shade/patterns';
import { ListPage } from '@tryghost/shade/page-templates';
import { AdminSidebarLayoutContext } from './use-admin-sidebar';
import { AdminSidebarToggle } from './admin-sidebar-toggle';

const titles = [
  ['/posts/analytics', 'Post analytics'],
  ['/analytics', 'Analytics'],
  ['/automations', 'Automations'],
  ['/members', 'Members'],
  ['/tags', 'Tags'],
  ['/comments', 'Comments'],
  ['/activitypub', 'Network'],
];

// Keep the existing route error body and exception handling. Eligible headers
// must still let the user reopen navigation when the routed content fails.
export function AdminPageError() {
  const enabled = useContext(AdminSidebarLayoutContext);
  const { pathname } = useLocation();
  if (!enabled) {
    return <ErrorPage />;
  }
  const title = titles.find(([path]) => pathname.startsWith(path))?.[1] ?? 'Admin';
  return (
    <Container className="admin7-page-content relative flex h-full flex-col" size="page">
      <ListPage>
        <ListPage.Header>
          <PageHeader blurredBackground={false} sticky={false}>
            <PageHeader.Left leading={<AdminSidebarToggle />}>
              <PageHeader.Title>{title}</PageHeader.Title>
            </PageHeader.Left>
          </PageHeader>
        </ListPage.Header>
        <ListPage.Body>
          <ErrorPage />
        </ListPage.Body>
      </ListPage>
    </Container>
  );
}
