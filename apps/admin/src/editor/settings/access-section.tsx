import { useId } from 'react';
import {
  Checkbox,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@tryghost/shade/components';
import { Inline, Stack, Text } from '@tryghost/shade/primitives';
import { getSettingValue, useBrowseSettings } from '@tryghost/admin-x-framework/api/settings';
import { useBrowseTiers } from '@tryghost/admin-x-framework/api/tiers';
import {
  settingsTiersError,
  settingsTiersPicker,
  settingsVisibilitySelect,
} from '@tryghost/test-data/selectors/editor';
import type { PostType } from '@/editor/card-config';
import { EDITOR_REQUEST_OPTIONS } from '@/editor/request-options';
import { TIERS_REQUIRED, tiersIncomplete } from '@/editor/session/settings-fields';
import type { EditorSessionHandle } from '@/editor/session/use-editor-session';
import { SettingsSection } from './settings-section';
import {
  VISIBILITY_OPTIONS,
  postTiers,
  selectedTierIds,
  selectedVisibility,
  tierOptions,
  tiersFromSelection,
  type TierOption,
} from './access-options';

function TierCheckbox({
  option,
  checked,
  onToggle,
}: {
  option: TierOption;
  checked: boolean;
  onToggle: () => void;
}) {
  const inputId = useId();

  return (
    <Inline gap="sm">
      <Checkbox checked={checked} id={inputId} onCheckedChange={onToggle} />
      <Label htmlFor={inputId}>{option.name}</Label>
    </Inline>
  );
}

function TierGroup({
  heading,
  options,
  selected,
  onToggle,
}: {
  heading: string;
  options: TierOption[];
  selected: ReadonlySet<string>;
  onToggle: (id: string) => void;
}) {
  if (options.length === 0) {
    return null;
  }

  return (
    <Stack gap="sm">
      <Text size="sm" tone="secondary" weight="medium">
        {heading}
      </Text>
      {options.map((option) => (
        <TierCheckbox
          key={option.id}
          checked={selected.has(option.id)}
          option={option}
          onToggle={() => onToggle(option.id)}
        />
      ))}
    </Stack>
  );
}

export interface AccessSectionProps {
  session: EditorSessionHandle;
  postType: PostType;
}

/**
 * Who can read the post: one of four visibility choices, plus the tiers that
 * `Specific tier(s)` grants. Both are settings fields, so the sidebar's save
 * policy decides when they are persisted.
 */
export function AccessSection({ session, postType }: AccessSectionProps) {
  const selectId = useId();
  const { data: settingsData } = useBrowseSettings({
    defaultErrorHandler: false,
    requestOptions: EDITOR_REQUEST_OPTIONS,
  });
  const defaultContentVisibility = getSettingValue<string>(
    settingsData?.settings ?? null,
    'default_content_visibility',
  );

  const visibility = selectedVisibility(session.settings.visibility, defaultContentVisibility);
  const selected = new Set(selectedTierIds(session.settings.tiers));

  const { data: tiersData } = useBrowseTiers({
    defaultErrorHandler: false,
    enabled: visibility === 'tiers',
    requestOptions: EDITOR_REQUEST_OPTIONS,
    searchParams: { filter: 'type:paid', limit: 'all' },
  });
  const options = tierOptions(tiersData?.tiers);

  // Leaving `tiers` clears the tiers it granted, as the tier pickers do.
  const changeVisibility = (next: string) =>
    session.editSettings({
      visibility: next,
      tiers: next === 'tiers' ? postTiers(session.settings.tiers) : [],
    });

  const toggleTier = (id: string) => {
    const next = new Set(selected);
    if (!next.delete(id)) {
      next.add(id);
    }
    session.editSettings({ visibility: 'tiers', tiers: tiersFromSelection(options, next) });
  };

  return (
    <SettingsSection>
      <Label htmlFor={selectId}>{postType === 'page' ? 'Page' : 'Post'} access</Label>
      <Select value={visibility} onValueChange={changeVisibility}>
        <SelectTrigger data-testid={settingsVisibilitySelect} id={selectId}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {VISIBILITY_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {visibility === 'tiers' ? (
        <Stack data-testid={settingsTiersPicker} gap="md">
          <TierGroup
            heading="Active tiers"
            options={options.filter((option) => !option.archived)}
            selected={selected}
            onToggle={toggleTier}
          />
          <TierGroup
            heading="Archived tiers"
            options={options.filter((option) => option.archived)}
            selected={selected}
            onToggle={toggleTier}
          />
          {tiersIncomplete(session.settings) ? (
            <Text className="text-destructive" data-testid={settingsTiersError} size="sm">
              {TIERS_REQUIRED}
            </Text>
          ) : null}
        </Stack>
      ) : null}
    </SettingsSection>
  );
}
