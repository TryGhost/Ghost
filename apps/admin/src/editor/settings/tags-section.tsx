import { useId } from 'react';
import { Label } from '@tryghost/shade/components';
import {
  settingsTagsField,
  settingsTagsInput,
  settingsTagsList,
  settingsTagsToken,
} from '@tryghost/test-data/selectors/editor';
import { EDITOR_REQUEST_OPTIONS } from '@/editor/request-options';
import type { EditorSessionHandle } from '@/editor/session/use-editor-session';
import { TagPicker } from '@/shared/tags/tag-picker';
import { addTag, removeTag, type TagLike } from '@/shared/tags/tag-selection';
import { SettingsSection } from './settings-section';

// The API's own limit on a tag name.
const TAG_NAME_MAX_LENGTH = 191;

/**
 * The post's tags in order, which is the `sort_order` Ghost stores. The field
 * holds the records the chips are drawn from; the save writes identities.
 */
export function TagsSection({ session }: { session: EditorSessionHandle }) {
  const inputId = useId();
  const tags = session.settings.tags;

  const commit = (next: ReadonlyArray<TagLike>) => {
    if (next !== tags) {
      session.editSettings({ tags: next });
    }
  };

  return (
    <SettingsSection>
      <Label htmlFor={inputId}>Tags</Label>
      <TagPicker
        defaultErrorHandler={false}
        inputId={inputId}
        inputLabel="Tags"
        maxLength={TAG_NAME_MAX_LENGTH}
        requestOptions={EDITOR_REQUEST_OPTIONS}
        selected={tags}
        testIds={{
          field: settingsTagsField,
          input: settingsTagsInput,
          list: settingsTagsList,
          token: settingsTagsToken,
        }}
        deferSearch
        hideSelected
        onAdd={(tag) => {
          commit(addTag(tags, tag));
        }}
        onRemove={(key) => {
          commit(removeTag(tags, key));
        }}
      />
    </SettingsSection>
  );
}
