import { useId } from 'react';
import { Label, Switch } from '@tryghost/shade/components';
import { Inline, Text } from '@tryghost/shade/primitives';
import { missesPageBuilderAttribute, useActiveTheme } from '@tryghost/admin-x-framework/api/themes';
import { isContributorUser, type User } from '@tryghost/admin-x-framework/api/users';
import {
  settingsShowTitleToggle,
  settingsShowTitleWarning,
} from '@tryghost/test-data/selectors/editor';
import { EDITOR_REQUEST_OPTIONS } from '@/editor/request-options';
import type { EditorSessionHandle } from '@/editor/session/use-editor-session';
import { SettingsSection } from './settings-section';

const PAGE_BUILDER_ATTRIBUTE = 'show_title_and_feature_image';
const THEME_WARNING = "Uh-oh. Looks like your theme doesn't support this feature.";
const THEME_DOCS_URL = 'https://docs.ghost.org/themes/helpers/';

export interface ShowTitleSectionProps {
  session: EditorSessionHandle;
  currentUser?: User;
}

/**
 * Whether the page renders its own title and feature image. A theme that never
 * asks for them cannot honour the choice, so the writer is told when it is off.
 */
export function ShowTitleSection({ session, currentUser }: ShowTitleSectionProps) {
  const inputId = useId();
  const showTitleAndFeatureImage = session.settings.show_title_and_feature_image ?? true;
  // Reading the active theme needs a permission Contributors lack, and the
  // warning only matters once the choice is off.
  const { data: themeData } = useActiveTheme({
    enabled: !(currentUser && isContributorUser(currentUser)) && !showTitleAndFeatureImage,
    defaultErrorHandler: false,
    requestOptions: EDITOR_REQUEST_OPTIONS,
  });
  const activeTheme = themeData?.themes?.[0];
  // A backend that reports no theme problems is treated as supporting the helper.
  const themeMissingSupport =
    !!activeTheme &&
    [...(activeTheme.errors ?? []), ...(activeTheme.warnings ?? [])].some((problem) =>
      missesPageBuilderAttribute(problem, PAGE_BUILDER_ATTRIBUTE),
    );

  return (
    <SettingsSection>
      <Inline gap="sm" justify="between">
        <Label htmlFor={inputId}>Show title and feature image</Label>
        <Switch
          checked={showTitleAndFeatureImage}
          data-testid={settingsShowTitleToggle}
          id={inputId}
          onCheckedChange={(next) => session.editSettings({ show_title_and_feature_image: next })}
        />
      </Inline>
      {!showTitleAndFeatureImage && themeMissingSupport ? (
        <Text data-testid={settingsShowTitleWarning} size="sm" tone="secondary">
          {THEME_WARNING}{' '}
          <a className="underline" href={THEME_DOCS_URL} rel="noopener noreferrer" target="_blank">
            Learn more
          </a>
        </Text>
      ) : null}
    </SettingsSection>
  );
}
