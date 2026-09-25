import { Fragment, memo, type ReactNode, useEffect, useId } from 'react';
import { Label, Switch, Textarea } from '@tryghost/shade/components';
import { Box, Inline, Text } from '@tryghost/shade/primitives';
import { cn } from '@tryghost/shade/utils';
import {
  canAccessSettings,
  isAuthorOrContributor,
  isContributorUser,
  type User,
} from '@tryghost/admin-x-framework/api/users';
import {
  postSettingsSidebar,
  settingsExcerptInput,
  settingsFeaturedToggle,
} from '@tryghost/test-data/selectors/editor';
import type { PostCardConfig, PostType } from '@/editor/card-config';
import type { EditorSessionHandle } from '@/editor/session/use-editor-session';
import { AccessSection } from './access-section';
import { PublishDateSection } from './publish-date-section';
import { AuthorsSection } from './authors-section';
import { CodeInjectionSection } from './code-injection-section';
import { DeleteSection } from './delete-section';
import { type EditorSettingsPort, useEditorSettingsPort } from './editor-settings-port';
import { KeyboardShortcutsSection } from './keyboard-shortcuts-section';
import { MetaDataSection } from './meta-data-section';
import { PostHistorySection } from './post-history-section';
import { SETTINGS_SECTION_ORDER, type SettingsSectionId } from './sections';
import { SettingsSection } from './settings-section';
import { SubviewContext, useSubviewController } from './settings-subview-context';
import { ShowTitleSection } from './show-title-section';
import { FACEBOOK_CARD_NETWORK, X_CARD_NETWORK } from './social-card-networks';
import { SocialCardSection } from './social-card-section';
import { TagsSection } from './tags-section';
import { TemplateSection } from './template-section';
import { UrlSection } from './url-section';

const MemoAccessSection = memo(AccessSection);
const MemoAuthorsSection = memo(AuthorsSection);
const MemoCodeInjectionSection = memo(CodeInjectionSection);
const MemoDeleteSection = memo(DeleteSection);
const MemoKeyboardShortcutsSection = memo(KeyboardShortcutsSection);
const MemoMetaDataSection = memo(MetaDataSection);
const MemoPostHistorySection = memo(PostHistorySection);
const MemoPublishDateSection = memo(PublishDateSection);
const MemoShowTitleSection = memo(ShowTitleSection);
const MemoSocialCardSection = memo(SocialCardSection);
const MemoTagsSection = memo(TagsSection);
const MemoTemplateSection = memo(TemplateSection);
const MemoUrlSection = memo(UrlSection);

const ExcerptSection = memo(function ExcerptSection({ session }: { session: EditorSettingsPort }) {
  const inputId = useId();

  return (
    <SettingsSection>
      <Label htmlFor={inputId}>Excerpt</Label>
      <Textarea
        data-testid={settingsExcerptInput}
        id={inputId}
        rows={3}
        value={session.bind.excerpt}
        onBlur={session.commitSettings}
        onChange={(event) => session.bind.onExcerptChange(event.target.value)}
      />
    </SettingsSection>
  );
});

const FeaturedSection = memo(function FeaturedSection({
  session,
  postType,
}: {
  session: EditorSettingsPort;
  postType: PostType;
}) {
  const inputId = useId();

  return (
    <SettingsSection>
      <Inline gap="sm" justify="between">
        <Label htmlFor={inputId}>Feature this {postType}</Label>
        <Switch
          checked={session.settings.featured}
          data-testid={settingsFeaturedToggle}
          id={inputId}
          onCheckedChange={(featured) => session.editSettings({ featured })}
        />
      </Inline>
    </SettingsSection>
  );
});

export interface PostSettingsSidebarProps {
  session: EditorSessionHandle;
  postType: PostType;
  /** The site's homepage URL, which the URL section previews the slug under. */
  siteUrl: string;
  /** Renders the cards of a version being previewed. */
  cardConfig: PostCardConfig;
  /** The feature image the writer is looking at, which the social cards fall back to. */
  featureImage: string | null;
  currentUser?: User;
  /** The excerpt renders under the title instead, so the sidebar leaves it out. */
  hasInlineExcerpt?: boolean;
}

/**
 * The post settings panel. Nothing here writes to the API: every field goes
 * through the session, which owns when it is persisted (see the README).
 */
export function PostSettingsSidebar({
  session: handle,
  postType,
  siteUrl,
  cardConfig,
  featureImage,
  currentUser,
  hasInlineExcerpt = false,
}: PostSettingsSidebarProps) {
  // The sections take the narrow port rather than the handle, so an edit they
  // cannot see does not hand them a new object.
  const session = useEditorSettingsPort(handle);
  // Owner, Administrator and Editor manage featured and access.
  const canManagePost = !!currentUser && canAccessSettings(currentUser);
  const canTag = !!currentUser && !isContributorUser(currentUser);
  // Ember hides the authors field from Authors and Contributors alike.
  const canCreditOthers = !!currentUser && !isAuthorOrContributor(currentUser);
  const subviews = useSubviewController();

  const sections: Record<SettingsSectionId, ReactNode> = {
    url: <MemoUrlSection postType={postType} session={session} siteUrl={siteUrl} />,
    'publish-date': <MemoPublishDateSection session={session} />,
    tags: canTag ? <MemoTagsSection session={session} /> : null,
    excerpt: hasInlineExcerpt ? null : <ExcerptSection session={session} />,
    featured: canManagePost ? <FeaturedSection postType={postType} session={session} /> : null,
    access: canManagePost ? <MemoAccessSection postType={postType} session={session} /> : null,
    authors: canCreditOthers ? (
      <MemoAuthorsSection currentUser={currentUser} session={session} />
    ) : null,
    'show-title-and-feature-image':
      postType === 'page' ? (
        <MemoShowTitleSection currentUser={currentUser} session={session} />
      ) : null,
    template: <MemoTemplateSection postType={postType} session={session} />,
    delete: <MemoDeleteSection postType={postType} session={session} />,
    'code-injection': <MemoCodeInjectionSection postType={postType} session={session} />,
    'meta-data': <MemoMetaDataSection session={session} siteUrl={siteUrl} />,
    'keyboard-shortcuts': <MemoKeyboardShortcutsSection />,
    'x-card': (
      <MemoSocialCardSection
        cardConfig={cardConfig}
        featureImage={featureImage}
        network={X_CARD_NETWORK}
        session={session}
        siteUrl={siteUrl}
      />
    ),
    'facebook-card': (
      <MemoSocialCardSection
        cardConfig={cardConfig}
        featureImage={featureImage}
        network={FACEBOOK_CARD_NETWORK}
        session={session}
        siteUrl={siteUrl}
      />
    ),
    'post-history': (
      <MemoPostHistorySection
        cardConfig={cardConfig}
        postType={postType}
        session={session}
        showExcerpt={hasInlineExcerpt}
        state={handle.state}
      />
    ),
  };

  // A pane whose section renders nothing would leave an empty panel with no way
  // back, so the panel falls back to the section list.
  const open = subviews.open && sections[subviews.open.id] ? subviews.open : null;
  useEffect(() => {
    if (subviews.open && !open) {
      subviews.close();
    }
  }, [open, subviews]);
  const panelLabel = `${postType === 'page' ? 'Page' : 'Post'} settings`;

  return (
    <SubviewContext.Provider value={subviews}>
      <Box
        className={cn(
          'absolute inset-y-0 right-0 z-30 w-[calc(var(--editor-settings-progress,1)*var(--editor-settings-width))] overflow-hidden [--editor-settings-width:350px] max-[500px]:[--editor-settings-width:100vw] lg:static lg:shrink-0',
          open?.wide && '[--editor-settings-width:500px]',
        )}
      >
        <aside
          aria-label={open?.title ?? panelLabel}
          className="my-2 mr-2 h-[calc(100%-var(--spacing)*4)] w-[calc(var(--editor-settings-width)-var(--spacing)*2)] overflow-x-hidden overflow-y-auto rounded-xl border border-border bg-sidebar"
          data-testid={postSettingsSidebar}
        >
          <Box className="min-h-full opacity-(--editor-settings-progress,1)">
            {open ? null : (
              <Box className="sticky top-0 z-10 bg-sidebar">
                <Inline align="center" className="px-4 py-3" gap="sm" justify="between">
                  <Text as="h2" className="pl-1" size="md" weight="semibold">
                    {panelLabel}
                  </Text>
                  <Box
                    aria-hidden="true"
                    className="size-(--editor-settings-toggle-width) shrink-0"
                  />
                </Inline>
              </Box>
            )}
            {SETTINGS_SECTION_ORDER.map((id) => (
              <Fragment key={id}>{open && open.id !== id ? null : sections[id]}</Fragment>
            ))}
          </Box>
        </aside>
      </Box>
    </SubviewContext.Provider>
  );
}
