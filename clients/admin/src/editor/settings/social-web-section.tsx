import { useId } from 'react';
import {
  FieldError,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
} from '@tryghost/shade/components';
import { Text } from '@tryghost/shade/primitives';
import { cn, formatNumber } from '@tryghost/shade/utils';
import { getSettingValue } from '@tryghost/admin-x-framework/api/settings';
import {
  settingsSocialWebNoteCount,
  settingsSocialWebNoteInput,
  settingsSocialWebShareSelect,
} from '@tryghost/test-data/selectors/editor';
import { useEditorSettings } from '@/editor/use-editor-settings';
import {
  DEFAULT_SOCIAL_WEB_SHARE,
  SOCIAL_WEB_SHARE_OPTIONS,
  characterCount,
  isSocialWebShare,
  socialWebNoteTextLimit,
  socialWebShareLabel,
} from '@/shared/social-web-share';
import { type EditorSettingsPort, isNewPost } from './editor-settings-port';
import { SettingsSection } from './settings-section';
import { useSettingsField } from './use-settings-field';

export interface SocialWebSectionProps {
  session: EditorSettingsPort;
  siteUrl: string;
}

/**
 * How the post is shared on the social web once it is published: as the full
 * article, as a short note linking to it, or not at all. The site's default
 * applies to new posts; the choice and the note text are fixed once the post
 * is published, because the post has already been shared.
 */
export function SocialWebSection({ session, siteUrl }: SocialWebSectionProps) {
  const selectId = useId();
  const noteHintId = useId();
  const note = useSettingsField(session, 'social_web_note', noteHintId);
  const { data: settingsData } = useEditorSettings();
  const siteSettings = settingsData?.settings ?? null;

  const socialWebEnabled = getSettingValue<boolean>(siteSettings, 'social_web_enabled') === true;
  const siteDefault = getSettingValue<string>(siteSettings, 'default_social_web_share');
  const record = session.loadedRecord;
  const { status } = session.publishTime;

  // A server without the setting sends neither the site default nor the post's
  // value, and the post has no field to show.
  const supported =
    session.settings.social_web_share !== null || (isNewPost(session) && siteDefault !== null);
  // An email-only post is never on the web, so there is nothing to share.
  const emailOnly =
    status === 'sent' || (!!record && 'email_only' in record && !!record.email_only);

  if (!socialWebEnabled || !supported || emailOnly) {
    return null;
  }

  const share =
    session.settings.social_web_share ??
    (isSocialWebShare(siteDefault) ? siteDefault : DEFAULT_SOCIAL_WEB_SHARE);
  const locked = status === 'published';
  const hint = SOCIAL_WEB_SHARE_OPTIONS.find((option) => option.value === share)?.hint;

  const postUrl =
    record?.status === 'published' && record.url
      ? record.url
      : `${siteUrl.replace(/\/+$/, '')}/${session.slug}/`;
  const noteLimit = socialWebNoteTextLimit(postUrl);
  const noteLength = characterCount(note.value);
  const noteTooLong = noteLength > noteLimit;
  // Once published, the title and excerpt may have changed since the note was
  // shared, so a preview built from them could be wrong.
  const defaultNote = locked
    ? ''
    : [session.bind.title, session.settings.custom_excerpt].filter(Boolean).join('\n\n');

  return (
    <SettingsSection>
      <Label htmlFor={selectId}>Share on the social web</Label>
      <Select
        disabled={locked}
        value={share}
        onValueChange={(value) => {
          if (isSocialWebShare(value)) {
            session.editSettings({ social_web_share: value });
          }
        }}
      >
        <SelectTrigger data-testid={settingsSocialWebShareSelect} id={selectId}>
          <SelectValue>{socialWebShareLabel(share)}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          {SOCIAL_WEB_SHARE_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Text size="sm" tone="secondary">
        {locked ? 'Can’t be changed after the post is published.' : hint}
      </Text>

      {share === 'note' ? (
        <>
          <Label className="mt-2" htmlFor={note.fieldProps.id}>
            Note text
          </Label>
          <Textarea
            data-testid={settingsSocialWebNoteInput}
            placeholder={defaultNote || 'The post’s title and excerpt'}
            rows={4}
            {...note.fieldProps}
            disabled={locked}
          />
          <Text data-testid={settingsSocialWebNoteCount} id={noteHintId} size="sm" tone="secondary">
            {locked ? null : note.value ? (
              <>
                <span
                  className={cn(
                    'font-bold',
                    noteTooLong ? 'text-destructive' : 'text-character-count',
                  )}
                >
                  {formatNumber(Math.abs(noteLimit - noteLength))}
                </span>{' '}
                {noteTooLong
                  ? 'characters too many, so the note will be shortened. '
                  : 'characters left. '}
              </>
            ) : (
              'Leave empty to use the title and excerpt. '
            )}
            A link to the post is added at the end.
          </Text>
          <FieldError {...note.errorProps}>{note.error}</FieldError>
        </>
      ) : null}
    </SettingsSection>
  );
}
