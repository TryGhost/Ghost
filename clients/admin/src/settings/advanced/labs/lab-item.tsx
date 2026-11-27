import React from 'react';
import { ListItem, ListItemActions, ListItemContent } from '@tryghost/shade/components';

const LabItem: React.FC<{
  title?: React.ReactNode;
  detail?: React.ReactNode;
  action?: React.ReactNode;
  testId?: string;
}> = ({ title, detail, action, testId }) => {
  return (
    <ListItem data-testid={testId} hover={false}>
      <ListItemContent className="py-3 pr-6">
        <div>{title}</div>
        {detail && <div className="text-sm text-muted-foreground">{detail}</div>}
      </ListItemContent>
      {action && <ListItemActions>{action}</ListItemActions>}
    </ListItem>
  );
};

export default LabItem;
