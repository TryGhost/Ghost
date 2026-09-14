import { useId } from 'react';
import {
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@tryghost/shade/components';
import { Text } from '@tryghost/shade/primitives';
import { useBrowseThemes } from '@tryghost/admin-x-framework/api/themes';
import {
  settingsTemplateSelect,
  settingsTemplateSlugMatch,
} from '@tryghost/test-data/selectors/editor';
import type { PostType } from '@/editor/card-config';
import { EDITOR_REQUEST_OPTIONS } from '@/editor/request-options';
import type { EditorSessionHandle } from '@/editor/session/use-editor-session';
import { SettingsSection } from './settings-section';
import {
  DEFAULT_TEMPLATE_LABEL,
  DEFAULT_TEMPLATE_VALUE,
  activeThemeTemplates,
  selectedTemplate,
  slugTemplate,
  templateOptions,
} from './template-options';

export interface TemplateSectionProps {
  session: EditorSessionHandle;
  postType: PostType;
}

/**
 * The theme template the post renders with. A settings field, so the sidebar's
 * save policy decides when it is persisted.
 */
export function TemplateSection({ session, postType }: TemplateSectionProps) {
  const selectId = useId();
  const { data } = useBrowseThemes({
    defaultErrorHandler: false,
    requestOptions: EDITOR_REQUEST_OPTIONS,
  });

  const templates = activeThemeTemplates(data?.themes);
  const options = templateOptions(templates);
  const matched = slugTemplate(templates, postType, session.slug);

  if (options.length === 0) {
    return null;
  }

  const chooseTemplate = (value: string) =>
    session.editSettings({
      custom_template: value === DEFAULT_TEMPLATE_VALUE ? null : value,
    });

  return (
    <SettingsSection>
      <Label htmlFor={selectId}>Template</Label>
      <Select
        disabled={!!matched}
        value={selectedTemplate(options, session.settings.custom_template)}
        onValueChange={chooseTemplate}
      >
        <SelectTrigger data-testid={settingsTemplateSelect} id={selectId}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={DEFAULT_TEMPLATE_VALUE}>{DEFAULT_TEMPLATE_LABEL}</SelectItem>
          {options.map((option) => (
            <SelectItem key={option.filename} value={option.filename}>
              {option.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {matched ? (
        <Text data-testid={settingsTemplateSlugMatch} size="sm" tone="secondary">
          {postType === 'page' ? 'Page' : 'Post'} URL matches {matched.filename}
        </Text>
      ) : null}
    </SettingsSection>
  );
}
