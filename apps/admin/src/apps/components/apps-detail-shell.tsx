import React from 'react';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@tryghost/shade/components';
import { Box, Container } from '@tryghost/shade/primitives';
import { DetailPage } from '@tryghost/shade/page-templates';
import { Link } from '@tryghost/admin-x-framework';
import { PageHeader } from '@tryghost/shade/patterns';

export interface AppsBreadcrumbItem {
  label: string;
  /** Omitted for the current page. */
  to?: string;
  testId?: string;
}

interface AppsDetailShellProps {
  breadcrumb: AppsBreadcrumbItem[];
  /** Rendered inside `PageHeader.Actions`. */
  actions?: React.ReactNode;
  testId?: string;
  children: React.ReactNode;
}

/**
 * Shared page chrome for the Apps section: an "Apps > … > Current" breadcrumb
 * header (matching member details) with optional actions, over a scrolling
 * body.
 */
export function AppsDetailShell({ breadcrumb, actions, testId, children }: AppsDetailShellProps) {
  return (
    <Box className="size-full">
      <Container className="relative flex h-full flex-col" size="page">
        <DetailPage data-testid={testId}>
          <DetailPage.Header>
            <PageHeader blurredBackground={false} sticky={false}>
              <PageHeader.Left>
                <Breadcrumb>
                  <BreadcrumbList>
                    {breadcrumb.map((item, index) => {
                      const isLast = index === breadcrumb.length - 1;
                      return (
                        <React.Fragment key={item.to ?? item.label}>
                          <BreadcrumbItem>
                            {isLast || !item.to ? (
                              <BreadcrumbPage className="truncate" data-testid={item.testId}>
                                {item.label}
                              </BreadcrumbPage>
                            ) : (
                              <BreadcrumbLink asChild>
                                <Link data-testid={item.testId} to={item.to}>
                                  {item.label}
                                </Link>
                              </BreadcrumbLink>
                            )}
                          </BreadcrumbItem>
                          {!isLast && <BreadcrumbSeparator />}
                        </React.Fragment>
                      );
                    })}
                  </BreadcrumbList>
                </Breadcrumb>
              </PageHeader.Left>
              {actions && (
                <PageHeader.Actions>
                  <PageHeader.ActionGroup>{actions}</PageHeader.ActionGroup>
                </PageHeader.Actions>
              )}
            </PageHeader>
          </DetailPage.Header>
          <DetailPage.Body>{children}</DetailPage.Body>
        </DetailPage>
      </Container>
    </Box>
  );
}

export default AppsDetailShell;
