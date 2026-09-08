import { Fragment, type ReactNode, useEffect, useId } from 'react';
import { Label, Separator, Switch, Textarea } from '@tryghost/shade/components';
import { Inline, Text } from '@tryghost/shade/primitives';
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
import { DeleteSection } from './delete-section';
import { MetaDataSection } from './meta-data-section';
import { PostHistorySection } from './post-history-section';
import { SETTINGS_SECTION_ORDER, type SettingsSectionId } from './sections';
import { SettingsSection } from './settings-section';
import { SubviewContext, useSubviewController } from './settings-subview-context';
import { ShowTitleSection } from './show-title-section';
import { TagsSection } from './tags-section';
import { TemplateSection } from './template-section';
import { UrlSection } from './url-section';

function ExcerptSection({ session }: { session: EditorSessionHandle }) {
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
}

function FeaturedSection({
  session,
  postType,
}: {
  session: EditorSessionHandle;
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
}

export interface PostSettingsSidebarProps {
  session: EditorSessionHandle;
  postType: PostType;
  /** The site's homepage URL, which the URL section previews the slug under. */
  siteUrl: string;
  /** Renders the cards of a version being previewed. */
  cardConfig: PostCardConfig;
  currentUser?: User;
  /** The excerpt renders under the title instead, so the sidebar leaves it out. */
  hasInlineExcerpt?: boolean;
}

/**
 * The post settings panel. Nothing here writes to the API: every field goes
 * through the session, which owns when it is persisted (see the README).
 */
export function PostSettingsSidebar({
  session,
  postType,
  siteUrl,
  cardConfig,
  currentUser,
  hasInlineExcerpt = false,
}: PostSettingsSidebarProps) {
  // Owner, Administrator and Editor manage featured and access.
  const canManagePost = !!currentUser && canAccessSettings(currentUser);
  const canTag = !!currentUser && !isContributorUser(currentUser);
  // Ember hides the authors field from Authors and Contributors alike.
  const canCreditOthers = !!currentUser && !isAuthorOrContributor(currentUser);
  const subviews = useSubviewController();

  const sections: Partial<Record<SettingsSectionId, ReactNode>> = {
    url: <UrlSection postType={postType} session={session} siteUrl={siteUrl} />,
    'publish-date': <PublishDateSection session={session} />,
    tags: canTag ? <TagsSection session={session} /> : null,
    excerpt: hasInlineExcerpt ? null : <ExcerptSection session={session} />,
    featured: canManagePost ? <FeaturedSection postType={postType} session={session} /> : null,
    access: canManagePost ? <AccessSection postType={postType} session={session} /> : null,
    authors: canCreditOthers ? (
      <AuthorsSection currentUser={currentUser} session={session} />
    ) : null,
    'show-title-and-feature-image':
      postType === 'page' ? <ShowTitleSection currentUser={currentUser} session={session} /> : null,
    template: <TemplateSection postType={postType} session={session} />,
    delete: <DeleteSection postType={postType} session={session} />,
    'meta-data': <MetaDataSection session={session} siteUrl={siteUrl} />,
    'post-history': (
      <PostHistorySection
        cardConfig={cardConfig}
        postType={postType}
        session={session}
        showExcerpt={hasInlineExcerpt}
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
      <aside
        aria-label={open?.title ?? panelLabel}
        className={cn(
          'absolute inset-y-0 right-0 z-10 w-[350px] overflow-y-auto border-l border-border bg-background shadow-lg max-[500px]:w-screen lg:static lg:shrink-0 lg:shadow-none',
          open?.wide && 'w-[500px]',
        )}
        data-testid={postSettingsSidebar}
      >
        {open ? null : (
          <>
            <Text as="h2" className="px-5 py-4" size="md" weight="semibold">
              {panelLabel}
            </Text>
            <Separator />
          </>
        )}
        {SETTINGS_SECTION_ORDER.map((id) => (
          <Fragment key={id}>{open && open.id !== id ? null : (sections[id] ?? null)}</Fragment>
        ))}
      </aside>
    </SubviewContext.Provider>
  );
}
