import React from 'react';

const MainLayout: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ children, ...props }) => {
  return (
    <div className="size-full">
      <div className="relative size-full" {...props}>
        <div className="mx-auto flex size-full max-w-page flex-col [&>[data-admin-content-grid]]:grid-cols-[minmax(0,1fr)]">
          {children}
        </div>
      </div>
    </div>
  );
};

export default MainLayout;
