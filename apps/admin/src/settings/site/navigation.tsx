import React from 'react';
import TopLevelGroup from '@/settings/components/top-level-group';
import { Button } from '@tryghost/shade/components';
import { useSettingsNavigation } from '@/settings/hooks/use-settings-navigation';
import { withErrorBoundary } from '@/settings/components/with-error-boundary';

const Navigation: React.FC<{ keywords: string[] }> = ({ keywords }) => {
  const { updateRoute } = useSettingsNavigation();
  const openPreviewModal = () => {
    updateRoute('navigation/edit');
  };

  return (
    <TopLevelGroup
      customButtons={
        <Button
          className="mt-[-5px]"
          size="sm"
          type="button"
          variant="ghost"
          onClick={openPreviewModal}
        >
          Customize
        </Button>
      }
      description="Set up primary and secondary menus"
      keywords={keywords}
      navid="navigation"
      testId="navigation"
      title="Navigation"
    />
  );
};

export default withErrorBoundary(Navigation, 'Navigation');
