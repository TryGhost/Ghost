import React from 'react';
import { useAdminPageChrome } from '@/layout/admin-page-chrome-context';

const MainLayout: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ children, ...props }) => {
  const pageChromeEnabled = useAdminPageChrome();
  return (
    <div className="size-full">
      <div className="relative size-full" {...props}>
        <div
          className={`mx-auto flex size-full max-w-page flex-col${pageChromeEnabled ? ' admin7-page-content' : ''}`}
        >
          {children}
        </div>
      </div>
    </div>
  );
};

export default MainLayout;
