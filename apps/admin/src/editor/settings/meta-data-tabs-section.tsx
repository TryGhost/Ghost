import { useEffect, useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@tryghost/shade/components';
import { Stack } from '@tryghost/shade/primitives';
import { LucideIcon } from '@tryghost/shade/utils';
import type { PostCardConfig } from '@/editor/card-config';
import type { EditorSettingsPort } from './editor-settings-port';
import { MetaDataFields } from './meta-data-section';
import {
  META_DATA_TABS,
  type MetaDataTab,
  type SettingsPanelField,
  isMetaDataTab,
  metaDataTabFor,
} from './sections';
import { SocialCardFields } from './social-card-section';
import { FACEBOOK_CARD_NETWORK, X_CARD_NETWORK } from './social-card-networks';
import { SettingsSubview } from './settings-subview';
import { useSubviews } from './settings-subview-context';
import { useSocialCardImage } from './use-social-card-image';

const TAB_LABELS: Record<MetaDataTab, string> = {
  'meta-data': 'Search',
  'x-card': 'X card',
  'facebook-card': 'Facebook card',
};

export interface MetaDataTabsSectionProps {
  session: EditorSettingsPort;
  /** The site's homepage URL, which the previews show the post under. */
  siteUrl: string;
  /** The feature image the writer is looking at, which the cards fall back to. */
  featureImage: string | null;
  /** Carries the site's own description and images, which the cards fall back to last. */
  cardConfig: PostCardConfig;
  /** A field the panel is taking the writer to, whose tab the pane opens on. */
  revealField?: SettingsPanelField | null;
}

/**
 * Search metadata and the X and Facebook cards as one pane with a tab each. The
 * pane opens on Search, unless the panel is taking the writer to a field under
 * another tab.
 */
export function MetaDataTabsSection({
  session,
  siteUrl,
  featureImage,
  cardConfig,
  revealField,
}: MetaDataTabsSectionProps) {
  const { open } = useSubviews();
  const isOpen = open?.id === 'meta-data';
  const [tab, setTab] = useState<MetaDataTab>('meta-data');
  // Held here rather than in the tabs, so an upload outlives a tab switch or a closed pane.
  const xImage = useSocialCardImage(session, X_CARD_NETWORK);
  const facebookImage = useSocialCardImage(session, FACEBOOK_CARD_NETWORK);

  // Closing resets the tab, so the next open from the row starts on Search.
  useEffect(() => {
    if (!isOpen) {
      setTab('meta-data');
    }
  }, [isOpen]);

  useEffect(() => {
    const revealTab = revealField ? metaDataTabFor(revealField) : null;
    if (revealTab) {
      setTab(revealTab);
    }
  }, [revealField]);

  const cardProps = { session, siteUrl, featureImage, cardConfig };

  return (
    <SettingsSubview
      closeLabel="Close meta data panel"
      icon={<LucideIcon.Search />}
      id="meta-data"
      label="Meta data"
      title="Meta data"
    >
      <Tabs
        value={tab}
        variant="underline"
        onValueChange={(value) => {
          if (isMetaDataTab(value)) {
            setTab(value);
          }
        }}
      >
        <TabsList aria-label="Meta data">
          {META_DATA_TABS.map((id) => (
            <TabsTrigger key={id} value={id}>
              {TAB_LABELS[id]}
            </TabsTrigger>
          ))}
        </TabsList>
        <TabsContent className="pt-5" value="meta-data">
          <Stack gap="lg">
            <MetaDataFields session={session} siteUrl={siteUrl} />
          </Stack>
        </TabsContent>
        <TabsContent className="pt-5" value="x-card">
          <Stack gap="lg">
            <SocialCardFields {...cardProps} image={xImage} network={X_CARD_NETWORK} />
          </Stack>
        </TabsContent>
        <TabsContent className="pt-5" value="facebook-card">
          <Stack gap="lg">
            <SocialCardFields
              {...cardProps}
              image={facebookImage}
              network={FACEBOOK_CARD_NETWORK}
            />
          </Stack>
        </TabsContent>
      </Tabs>
    </SettingsSubview>
  );
}
