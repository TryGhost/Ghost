import { Fragment, type ReactNode, useId } from 'react';
import { Label, Separator, Switch, Textarea } from '@tryghost/shade/components';
import { Stack, Text } from '@tryghost/shade/primitives';
import { isAuthorOrContributor, type User } from '@tryghost/admin-x-framework/api/users';
import {
  postSettingsSidebar,
  settingsExcerptInput,
  settingsFeaturedToggle,
} from '@tryghost/test-data/selectors/editor';
import type { PostType } from '@/editor/card-config';
import type { EditorSessionHandle } from '@/editor/session/use-editor-session';
import { SETTINGS_SECTION_ORDER, type SettingsSectionId } from './sections';

function SettingsSection({ children }: { children: ReactNode }) {
  return (
    <>
      <Stack className="px-5 py-4" gap="sm">
        {children}
      </Stack>
      <Separator />
    </>
  );
}

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
      <Stack className="flex-row items-center justify-between" gap="sm">
        <Label htmlFor={inputId}>Feature this {postType}</Label>
        <Switch
          checked={session.settings.featured}
          data-testid={settingsFeaturedToggle}
          id={inputId}
          onCheckedChange={(featured) => session.editSettings({ featured })}
        />
      </Stack>
    </SettingsSection>
  );
}

export interface PostSettingsSidebarProps {
  session: EditorSessionHandle;
  postType: PostType;
  currentUser?: User;
}

/**
 * The post settings panel. Nothing here writes to the API: every field goes
 * through the session, which owns when it is persisted (see the README).
 */
export function PostSettingsSidebar({ session, postType, currentUser }: PostSettingsSidebarProps) {
  const canFeature = !!currentUser && !isAuthorOrContributor(currentUser);

  const sections: Partial<Record<SettingsSectionId, ReactNode>> = {
    excerpt: <ExcerptSection session={session} />,
    featured: canFeature ? <FeaturedSection postType={postType} session={session} /> : null,
  };

  return (
    <aside
      aria-label={`${postType === 'page' ? 'Page' : 'Post'} settings`}
      className="w-[350px] shrink-0 overflow-y-auto border-l border-border bg-background"
      data-testid={postSettingsSidebar}
    >
      <Text className="px-5 py-4 font-semibold" size="md">
        {postType === 'page' ? 'Page' : 'Post'} settings
      </Text>
      <Separator />
      {SETTINGS_SECTION_ORDER.map((id) => (
        <Fragment key={id}>{sections[id] ?? null}</Fragment>
      ))}
    </aside>
  );
}
