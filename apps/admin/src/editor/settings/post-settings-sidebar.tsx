import { Fragment, type ReactNode, useId } from 'react';
import { Label, Separator, Switch, Textarea } from '@tryghost/shade/components';
import { Inline, Text } from '@tryghost/shade/primitives';
import { canAccessSettings, type User } from '@tryghost/admin-x-framework/api/users';
import {
  postSettingsSidebar,
  settingsExcerptInput,
  settingsFeaturedToggle,
} from '@tryghost/test-data/selectors/editor';
import type { PostType } from '@/editor/card-config';
import type { EditorSessionHandle } from '@/editor/session/use-editor-session';
import { AccessSection } from './access-section';
import { SETTINGS_SECTION_ORDER, type SettingsSectionId } from './sections';
import { SettingsSection } from './settings-section';

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
        onBlur={session.bind.onExcerptBlur}
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
  currentUser,
  hasInlineExcerpt = false,
}: PostSettingsSidebarProps) {
  // Owner, Administrator and Editor: the roles Ember shows these sections to.
  const canManagePost = !!currentUser && canAccessSettings(currentUser);

  const sections: Partial<Record<SettingsSectionId, ReactNode>> = {
    excerpt: hasInlineExcerpt ? null : <ExcerptSection session={session} />,
    featured: canManagePost ? <FeaturedSection postType={postType} session={session} /> : null,
    access: canManagePost ? <AccessSection postType={postType} session={session} /> : null,
  };

  return (
    <aside
      aria-label={`${postType === 'page' ? 'Page' : 'Post'} settings`}
      className="absolute inset-y-0 right-0 z-10 w-[350px] overflow-y-auto border-l border-border bg-background shadow-lg max-[500px]:w-screen lg:static lg:shrink-0 lg:shadow-none"
      data-testid={postSettingsSidebar}
    >
      <Text as="h2" className="px-5 py-4" size="md" weight="semibold">
        {postType === 'page' ? 'Page' : 'Post'} settings
      </Text>
      <Separator />
      {SETTINGS_SECTION_ORDER.map((id) => (
        <Fragment key={id}>{sections[id] ?? null}</Fragment>
      ))}
    </aside>
  );
}
