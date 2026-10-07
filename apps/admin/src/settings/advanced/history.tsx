import React from 'react';
import TopLevelGroup from '@/settings/components/top-level-group';
import { Button } from '@tryghost/shade/components';
import { useSettingsNavigation } from '@/settings/hooks/use-settings-navigation';
import { withErrorBoundary } from '@/settings/components/with-error-boundary';

const History: React.FC<{ keywords: string[] }> = ({ keywords }) => {
  const { updateRoute } = useSettingsNavigation();
  const openHistoryModal = () => {
    updateRoute('history/view');
  };

  return (
    <TopLevelGroup
      customButtons={
        <Button
          className="mt-[-5px]"
          size="sm"
          type="button"
          variant="ghost"
          onClick={openHistoryModal}
        >
          View history
        </Button>
      }
      description="View system event log"
      keywords={keywords}
      navid="history"
      testId="history"
      title="History"
    />
  );
};

export default withErrorBoundary(History, 'History');
