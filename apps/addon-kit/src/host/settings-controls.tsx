import { useEffect, useId, useState } from 'react';
import {
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Switch,
  Textarea,
} from '@tryghost/shade/components';
import { Inline, Stack, Text } from '@tryghost/shade/primitives';
import type {
  GhEditorInputProperties,
  GhEditorSelectProperties,
  GhEditorToggleProperties,
} from '../editor-settings/elements.ts';

export function SettingsInput({
  label,
  description,
  value = '',
  placeholder,
  multiline,
  onChange,
}: GhEditorInputProperties & { onChange?: (value: string) => void }) {
  const id = useId();
  const [draft, setDraft] = useState(value);
  const [focused, setFocused] = useState(false);
  useEffect(() => {
    if (!focused) {
      setDraft(value);
    }
  }, [value, focused]);
  const props = {
    id,
    placeholder,
    value: draft,
    onFocus: () => setFocused(true),
    onBlur: () => setFocused(false),
    onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setDraft(event.target.value);
      onChange?.(event.target.value);
    },
  };
  return (
    <Stack className="w-full min-w-0" gap="sm">
      <Label htmlFor={id}>{label}</Label>
      {multiline ? <Textarea {...props} /> : <Input {...props} />}
      {description && (
        <Text size="sm" tone="secondary">
          {description}
        </Text>
      )}
    </Stack>
  );
}

export function SettingsSelect({
  label,
  description,
  value,
  options = [],
  onChange,
}: GhEditorSelectProperties & { onChange?: (value: string) => void }) {
  const id = useId();
  return (
    <Stack className="w-full min-w-0" gap="sm">
      <Label htmlFor={id}>{label}</Label>
      <Select
        value={value || '__empty__'}
        onValueChange={(next) => onChange?.(next === '__empty__' ? '' : next)}
      >
        <SelectTrigger className="w-full" id={id}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value || '__empty__'}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {description && (
        <Text size="sm" tone="secondary">
          {description}
        </Text>
      )}
    </Stack>
  );
}

export function SettingsToggle({
  label,
  description,
  checked,
  onChange,
}: GhEditorToggleProperties & { onChange?: (value: boolean) => void }) {
  const id = useId();
  return (
    <Inline align="center" className="w-full" gap="lg" justify="between">
      <Stack gap="sm">
        <Label htmlFor={id}>{label}</Label>
        {description && (
          <Text size="sm" tone="secondary">
            {description}
          </Text>
        )}
      </Stack>
      <Switch checked={checked ?? false} id={id} onCheckedChange={onChange} />
    </Inline>
  );
}
