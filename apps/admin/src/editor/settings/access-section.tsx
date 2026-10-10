import { useEffect, useId } from 'react';
import {
  FieldError,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@tryghost/shade/components';
import { Stack } from '@tryghost/shade/primitives';
import { LucideIcon } from '@tryghost/shade/utils';
import { getSettingValue } from '@tryghost/admin-x-framework/api/settings';
import { useBrowseTiers } from '@tryghost/admin-x-framework/api/tiers';
import {
  settingsTierChip,
  settingsTiersError,
  settingsTiersList,
  settingsTiersPicker,
  settingsVisibilitySelect,
} from '@tryghost/test-data/selectors/editor';
import { ChipPicker } from '@/shared/pickers/chip-picker';
import type { PostType } from '@/editor/card-config';
import { PAID_TIERS_SEARCH_PARAMS } from '@/editor/browse-params';
import { useEditorSettings } from '@/editor/use-editor-settings';
import { EDITOR_REQUEST_OPTIONS } from '@/editor/request-options';
import {
  TIERS_REQUIRED,
  tiersIncomplete,
  type EditorSettingsFields,
} from '@/editor/session/settings-fields';
import { type EditorSettingsPort, isNewPost } from './editor-settings-port';
import { SectionLoadError } from './section-load-error';
import { SettingsSection } from './settings-section';
import {
  VISIBILITY_OPTIONS,
  defaultTierIds,
  postTiers,
  selectedTierIds,
  selectedVisibility,
  tierOptions,
  tiersFromSelection,
  type TierOption,
} from './access-options';

export interface AccessSectionProps {
  session: EditorSettingsPort;
  postType: PostType;
}

/**
 * Who can read the post: one of four visibility choices, plus the tiers that
 * `Specific tier(s)` grants. Both are settings fields, so the sidebar's save
 * policy decides when they are persisted.
 */
export function AccessSection({ session, postType }: AccessSectionProps) {
  const selectId = useId();
  const tiersErrorId = useId();
  const { data: settingsData } = useEditorSettings();
  const defaultContentVisibility = getSettingValue<string>(
    settingsData?.settings ?? null,
    'default_content_visibility',
  );
  const defaultContentVisibilityTiers = getSettingValue<string>(
    settingsData?.settings ?? null,
    'default_content_visibility_tiers',
  );

  const visibility = selectedVisibility(session.settings.visibility, defaultContentVisibility);
  // Core grants a new post the default's tiers on create, so they stand in until
  // the post has a visibility of its own, and a tier pick starts from them.
  const followsDefaultTiers =
    isNewPost(session) && !session.settings.visibility && visibility === 'tiers';
  const selected = new Set(
    followsDefaultTiers
      ? defaultTierIds(defaultContentVisibilityTiers)
      : selectedTierIds(session.settings.tiers),
  );
  const tiersMissing = tiersIncomplete(session.settings);

  const {
    data: tiersData,
    fetchNextPage,
    hasNextPage,
    isError: tiersFailed,
    isFetching: tiersFetching,
    isFetchingNextPage,
    refetch: refetchTiers,
  } = useBrowseTiers({
    defaultErrorHandler: false,
    enabled: visibility === 'tiers',
    requestOptions: EDITOR_REQUEST_OPTIONS,
    searchParams: PAID_TIERS_SEARCH_PARAMS,
  });

  // Core caps `limit=all`, so the response can still contain a next page. The
  // list is not complete, so it is not shown, until every page has arrived.
  useEffect(() => {
    if (hasNextPage && !isFetchingNextPage && !tiersFailed) {
      void fetchNextPage();
    }
  }, [fetchNextPage, hasNextPage, isFetchingNextPage, tiersFailed]);
  const options = hasNextPage ? [] : tierOptions(tiersData?.tiers);
  // A selected tier the browse has not named yet has no chip to draw until it does.
  const selectedOptions = options.filter((option) => selected.has(option.id));

  // An incomplete pair is left out of every write. On a post the server has not
  // created yet it is staged without a save of its own: that write would carry nothing.
  const editAccess = (patch: Pick<EditorSettingsFields, 'visibility' | 'tiers'>) => {
    if (tiersIncomplete(patch) && isNewPost(session)) {
      session.stageSettings(patch);
      return;
    }
    session.editSettings(patch);
  };

  // Leaving `tiers` clears the tiers it granted, as the tier pickers do.
  const changeVisibility = (next: string) =>
    editAccess({
      visibility: next,
      tiers: next === 'tiers' ? postTiers(session.settings.tiers) : [],
    });

  const toggleTier = (id: string) => {
    const next = new Set(selected);
    if (!next.delete(id)) {
      next.add(id);
    }
    const patch = { visibility: 'tiers', tiers: tiersFromSelection(options, next) };
    // Each save of a published post writes a revision; as in Ember, a tier pick
    // outside a draft waits for the next settings save or Update.
    if (session.publishTime.status !== 'draft') {
      session.stageSettings(patch);
      return;
    }
    editAccess(patch);
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
        <Stack data-settings-field="tiers" gap="sm">
          {/* The chips are drawn from the browse, so without it the field could only
              show an empty selection; the failure stands in its place. */}
          {tiersFailed ? (
            <SectionLoadError message="Couldn’t load tiers." onRetry={() => void refetchTiers()} />
          ) : (
            <ChipPicker<TierOption, TierOption>
              chipClassName={() => 'text-(length:--text-control)'}
              chipVariant={() => 'secondary'}
              describedBy={tiersMissing ? tiersErrorId : undefined}
              emptyMessage={tiersFetching || hasNextPage ? 'Loading tiers...' : 'No tiers found'}
              getGroup={(option) => (option.archived ? 'Archived tiers' : 'Active tiers')}
              getKey={(option) => option.id}
              getLabel={(option) => option.name}
              inputLabel="Tiers"
              invalid={tiersMissing}
              matches={(option, term) => option.name.toLowerCase().includes(term.toLowerCase())}
              options={options}
              placeholder="Select tiers..."
              renderOption={(option, { chosen }) => (
                <>
                  <span className="truncate">{option.name}</span>
                  {chosen && <LucideIcon.Check className="ms-auto size-4 shrink-0 text-primary" />}
                </>
              )}
              selected={selectedOptions}
              testIds={{
                field: settingsTiersPicker,
                list: settingsTiersList,
                chip: settingsTierChip,
              }}
              onAdd={(option) => toggleTier(option.id)}
              onRemove={toggleTier}
            />
          )}
          {tiersMissing ? (
            <FieldError data-testid={settingsTiersError} id={tiersErrorId}>
              {TIERS_REQUIRED}
            </FieldError>
          ) : null}
        </Stack>
      ) : null}
    </SettingsSection>
  );
}
