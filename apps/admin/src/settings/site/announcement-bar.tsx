import React from 'react';
import TopLevelGroup from '@/settings/components/top-level-group';
import { Button } from '@tryghost/shade/components';
import { useSettingsNavigation } from '@/settings/hooks/use-settings-navigation';
import { withErrorBoundary } from '@/settings/components/with-error-boundary';

const AnnouncementBar: React.FC<{ keywords: string[] }> = ({ keywords }) => {
  const { updateRoute } = useSettingsNavigation();
  const openModal = () => {
    updateRoute('announcement-bar/edit');
  };

  return (
    <TopLevelGroup
      customButtons={
        <Button className="mt-[-5px]" size="sm" type="button" variant="ghost" onClick={openModal}>
          Customize
        </Button>
      }
      description="Highlight important updates or offers"
      keywords={keywords}
      navid="announcement-bar"
      testId="announcement-bar"
      title="Announcement bar"
    />
  );
};

export default withErrorBoundary(AnnouncementBar, 'Announcement bar');
