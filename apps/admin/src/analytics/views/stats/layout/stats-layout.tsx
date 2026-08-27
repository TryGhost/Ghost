import MainLayout from '@/analytics/components/layout';
import React, { forwardRef } from 'react';

const StatsLayout = forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ children }, ref) => {
    return (
      <MainLayout>
        <div ref={ref} className="grid w-full grow" data-admin-content-grid>
          <div className="admin7-page-gutter flex h-full flex-col px-6">{children}</div>
        </div>
      </MainLayout>
    );
  },
);

StatsLayout.displayName = 'StatsLayout';

export default StatsLayout;
