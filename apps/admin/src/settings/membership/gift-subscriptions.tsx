import React from 'react';
import TopLevelGroup from '@/settings/components/top-level-group';
import {
  Button,
  CopyField,
  CopyFieldActions,
  CopyFieldContent,
  CopyFieldCopyButton,
  CopyFieldLabel,
  CopyFieldValue,
  Link,
} from '@tryghost/shade/components';
import { SettingGroupContent } from '@tryghost/shade/patterns';
import { useGlobalData } from '@/settings/providers/global-data-context';
import { withErrorBoundary } from '@/settings/components/with-error-boundary';

const GiftSubscriptions: React.FC<{ keywords: string[] }> = ({ keywords }) => {
  const { siteData } = useGlobalData();
  const giftUrl = `${siteData?.url.replace(/\/$/, '')}/#/portal/gift`;

  const openPreview = () => {
    window.open(giftUrl, '_blank');
  };

  return (
    <TopLevelGroup
      description={
        <>
          Allow your readers to share your work by purchasing a gift subscription for a friend or
          colleague.{' '}
          <Link href="https://ghost.org/help/gift-subscriptions/" external>
            Learn more
          </Link>
        </>
      }
      keywords={keywords}
      navid="gift-subscriptions"
      testId="gift-subscriptions"
      title="Gift subscriptions"
      hideEditButton
    >
      <SettingGroupContent columns={1}>
        <CopyField value={giftUrl}>
          <CopyFieldLabel>Shareable link</CopyFieldLabel>
          <CopyFieldContent>
            <CopyFieldValue data-testid="gift-url" />
            <CopyFieldActions>
              <Button
                data-testid="preview-shareable-link"
                size="sm"
                type="button"
                variant="ghost"
                onClick={openPreview}
              >
                Preview
              </Button>
              <CopyFieldCopyButton copiedLabel="Copied" data-testid="copy-shareable-link">
                Copy link
              </CopyFieldCopyButton>
            </CopyFieldActions>
          </CopyFieldContent>
        </CopyField>
      </SettingGroupContent>
    </TopLevelGroup>
  );
};

export default withErrorBoundary(GiftSubscriptions, 'Gift subscriptions');
