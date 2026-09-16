import DesignSettingsImg from '@/settings/assets/images/design-settings.png';
import React from 'react';
import TopLevelGroup from '@/settings/components/top-level-group';
import { Button } from '@tryghost/shade/components';
import { Inline } from '@tryghost/shade/primitives';
import { useGlobalData } from '@/settings/providers/global-data-context';
import { useSettingsNavigation } from '@/settings/hooks/use-settings-navigation';
import { useNavigate } from '@tryghost/admin-x-framework';
import { withErrorBoundary } from '@/settings/components/with-error-boundary';

const DesignSetting: React.FC<{ keywords: string[] }> = ({ keywords }) => {
  const navigate = useNavigate();
  const { config } = useGlobalData();
  const { updateRoute } = useSettingsNavigation();
  const hasDesignBuilder = config.labs?.designBuilder === true;
  const openPreviewModal = () => {
    updateRoute('design/edit');
  };

  const openBuilder = () => {
    navigate('/builder/theme');
  };

  return (
    <TopLevelGroup
      customButtons={
        <Inline align="center" gap="sm">
          {hasDesignBuilder && (
            <Button size="sm" type="button" variant="ghost" onClick={openBuilder}>
              Build with AI
            </Button>
          )}
          <Button size="sm" type="button" variant="ghost" onClick={openPreviewModal}>
            Customize
          </Button>
        </Inline>
      }
      description="Customize the style and layout of your site"
      keywords={keywords}
      navid="design"
      testId="design"
      title="Design & branding"
    >
      <img src={DesignSettingsImg} />
    </TopLevelGroup>
  );
};

export default withErrorBoundary(DesignSetting, 'Branding and design');
