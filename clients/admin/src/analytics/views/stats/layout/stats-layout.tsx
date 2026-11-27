import MainLayout from '@/analytics/components/layout';
import React, { forwardRef } from 'react';
import { ListPage, usePageChrome } from '@tryghost/shade/page-templates';

const StatsLayout = forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ children }, ref) => {
    const { largeTitles } = usePageChrome();

    // With large titles on (admin7Design), a list page: StatsHeader is its
    // header, and the view below it its content
    if (largeTitles) {
      return (
        <MainLayout>
          {/* Holds the ref (e.g. to find the scroll container) without a box of its own */}
          <div ref={ref} className="contents">
            <ListPage>{children}</ListPage>
          </div>
        </MainLayout>
      );
    }

    return (
      <MainLayout>
        <div ref={ref} className="grid w-full grow" data-admin-content-grid>
          <div className="flex h-full flex-col px-(--page-gutter)">{children}</div>
        </div>
      </MainLayout>
    );
  },
);

StatsLayout.displayName = 'StatsLayout';

export default StatsLayout;
