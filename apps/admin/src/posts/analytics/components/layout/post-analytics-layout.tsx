import { AdminSidebarLayoutContext } from '@/layout/use-admin-sidebar';
import React from 'react';
import { Box, Container } from '@tryghost/shade/primitives';

const PostAnalyticsLayout: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ children }) => {
  const sidebarEnabled = React.useContext(AdminSidebarLayoutContext);
  return (
    <Box className="size-full">
      <Container
        className={`relative flex h-full flex-col${sidebarEnabled ? ' admin7-page-content' : ''}`}
        size="page"
      >
        <div className="grid w-full grow" data-admin-content-grid>
          <div className="admin7-page-gutter flex h-full flex-col px-8">{children}</div>
        </div>
      </Container>
    </Box>
  );
};

export default PostAnalyticsLayout;
