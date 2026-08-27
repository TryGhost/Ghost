import { AdminSidebarLayoutContext } from '@/layout/use-admin-sidebar';
import React from 'react';

const MainLayout: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ children, ...props }) => {
  const sidebarEnabled = React.useContext(AdminSidebarLayoutContext);
  return (
    <div className="size-full">
      <div className="relative size-full" {...props}>
        <div
          className={`mx-auto flex size-full max-w-page flex-col${sidebarEnabled ? ' admin7-page-content' : ''}`}
        >
          {children}
        </div>
      </div>
    </div>
  );
};

export default MainLayout;
