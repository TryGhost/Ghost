import { useCallback, useEffect, useId, useState } from 'react';
import {
  Button,
  Checkbox,
  Input,
  Label,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@tryghost/shade/components';
import { Box, Inline, Stack, Text } from '@tryghost/shade/primitives';
import { PageHeader } from '@tryghost/shade/patterns';
import { LucideIcon } from '@tryghost/shade/utils';
import { listDesignSettings } from '@/builder/workspaces/theme/design-setting-tools';
import type { ThemeDraft } from '@/builder/workspaces/theme/theme-state';
import type { CanvasEditorRender, CanvasPatch } from './canvas-driver';

export type CanvasSettingsDraft = { baseRevision: string; identifiers: string[] };

function label(identifier: string) {
  const name = identifier.slice(identifier.indexOf('.') + 1).replaceAll('_', ' ');
  return name.charAt(0).toUpperCase() + name.slice(1);
}

/** A local form; accepted settings still belong to the shared theme workspace. */
export function CanvasDesignSettings({
  readDraft,
  revision,
  dataGeneration,
  busy,
  apply,
  onDraftChange,
}: {
  readDraft: () => ThemeDraft;
  revision: string;
  dataGeneration: number;
  busy: boolean;
  apply: (patch: CanvasPatch) => Promise<CanvasEditorRender>;
  onDraftChange: (draft: CanvasSettingsDraft | null) => void;
}) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [snapshot, setSnapshot] = useState<ThemeDraft | null>(null);
  const [changes, setChanges] = useState<Record<string, string | boolean | null>>({});
  const [error, setError] = useState<string | null>(null);
  const [applying, setApplying] = useState(false);
  const dirty = Object.keys(changes).length > 0;
  const reload = useCallback(() => {
    setSnapshot(readDraft());
    setChanges({});
    setError(null);
  }, [readDraft]);
  useEffect(() => {
    if (open && !dirty) {
      reload();
    }
  }, [open, revision, dirty, reload]);
  useEffect(() => {
    onDraftChange(
      dirty && snapshot
        ? { baseRevision: snapshot.revision, identifiers: Object.keys(changes) }
        : null,
    );
  }, [changes, dirty, snapshot, onDraftChange]);
  const result = snapshot && listDesignSettings(snapshot);
  const settings = result?.ok ? result.data.settings.filter((setting) => setting.writable) : [];
  const update = (
    identifier: string,
    value: string | boolean | null,
    baseline: string | boolean | null,
  ) => {
    setChanges((current) => {
      const next = { ...current };
      if (value === baseline) {
        delete next[identifier];
      } else {
        next[identifier] = value;
      }
      return next;
    });
    setError(null);
  };
  const submit = async () => {
    if (!snapshot || !dirty || busy || applying) {
      return;
    }
    if (snapshot.revision !== revision) {
      setError('The theme changed. Reload settings before applying your values.');
      return;
    }
    setApplying(true);
    setError(null);
    try {
      await apply({
        expectedRevision: snapshot.revision,
        expectedDataGeneration: dataGeneration,
        settings: changes,
      });
      reload();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : String(failure));
    } finally {
      setApplying(false);
    }
  };
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <PageHeader.Action
          className="relative"
          label={dirty ? 'Theme settings (unapplied changes)' : 'Theme settings'}
          iconOnly
        >
          <LucideIcon.SlidersHorizontal />
          {dirty && (
            <Box
              aria-hidden="true"
              className="absolute top-1 right-1 size-1.5 rounded-full bg-primary"
            />
          )}
        </PageHeader.Action>
      </PopoverTrigger>
      <PopoverContent align="end" className="max-h-[70vh] w-80 overflow-y-auto">
        <Stack gap="md">
          <Text as="h2" weight="semibold">
            Theme settings
          </Text>
          {settings.map((setting) => {
            const controlId = `${id}-${setting.identifier}`;
            const labelId = `${controlId}-label`;
            const value = Object.hasOwn(changes, setting.identifier)
              ? changes[setting.identifier]
              : setting.stagedValue;
            const change = (next: string | boolean | null) =>
              update(setting.identifier, next, setting.stagedValue);
            return (
              <Stack key={setting.identifier} gap="xs">
                <Label htmlFor={controlId} id={labelId}>
                  {label(setting.identifier)}
                </Label>
                {setting.type === 'boolean' ? (
                  <Checkbox
                    aria-labelledby={labelId}
                    checked={value === true}
                    disabled={applying}
                    id={controlId}
                    onCheckedChange={(next) => change(next === true)}
                  />
                ) : setting.type === 'select' ? (
                  <Select
                    disabled={applying}
                    value={typeof value === 'string' ? value : ''}
                    onValueChange={change}
                  >
                    <SelectTrigger aria-labelledby={labelId} id={controlId}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {setting.choices?.map((choice) => (
                        <SelectItem key={choice} value={choice}>
                          {choice}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    aria-labelledby={labelId}
                    disabled={applying}
                    id={controlId}
                    placeholder={
                      setting.identifier.startsWith('global.') && setting.type === 'text'
                        ? 'Theme default'
                        : undefined
                    }
                    value={typeof value === 'string' ? value : ''}
                    onChange={(event) =>
                      change(
                        event.target.value === '' &&
                          setting.identifier.startsWith('global.') &&
                          setting.type === 'text'
                          ? null
                          : event.target.value,
                      )
                    }
                  />
                )}
                {setting.description && (
                  <Text size="xs" tone="secondary">
                    {setting.description}
                  </Text>
                )}
              </Stack>
            );
          })}
          {error && (
            <Text role="alert" size="sm">
              {error}
            </Text>
          )}
          <Inline gap="sm" wrap>
            <Button
              disabled={!dirty || busy || applying}
              size="sm"
              onClick={() => {
                void submit();
              }}
            >
              {applying ? 'Applying settings…' : 'Apply settings'}
            </Button>
            <Button disabled={busy || applying} size="sm" variant="ghost" onClick={reload}>
              Reload settings
            </Button>
          </Inline>
        </Stack>
      </PopoverContent>
    </Popover>
  );
}
