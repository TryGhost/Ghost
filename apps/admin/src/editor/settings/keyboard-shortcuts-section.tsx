import { useMemo } from 'react';
import { Kbd, KbdGroup, Tooltip, TooltipContent, TooltipTrigger } from '@tryghost/shade/components';
import { Inline, Stack, Text } from '@tryghost/shade/primitives';
import { LucideIcon, cn } from '@tryghost/shade/utils';
import { settingsShortcutRow } from '@tryghost/test-data/selectors/editor';
import { isMacPlatform } from '@/utils/is-mac-platform';
import {
  keyboardShortcutGroups,
  type Shortcut,
  type ShortcutKey,
  type ShortcutStyle,
} from './keyboard-shortcuts';
import { SettingsSubview } from './settings-subview';

const LABEL_CLASSES: Record<ShortcutStyle, string> = {
  bold: 'font-semibold',
  italic: 'italic',
  underline: 'underline',
  strikethrough: 'line-through',
  // A sample of the highlight the editor applies, not themed chrome, so the
  // pair stays the same in either theme.
  highlight: 'bg-yellow-200 text-black',
  link: 'text-ghostaccent',
  code: 'font-mono',
};

function KeyCap({ token }: { token: ShortcutKey }) {
  const cap = (
    <Kbd
      aria-label={token.tooltip}
      className={cn(
        token.mono && 'font-mono',
        token.plain && 'bg-transparent',
        // Kbd takes no pointer events by default; the cap opts back in so the
        // glyph reads as the tooltip's target.
        token.tooltip && 'pointer-events-auto',
      )}
      role={token.tooltip ? 'img' : undefined}
    >
      {token.text}
    </Kbd>
  );

  if (!token.tooltip) {
    return cap;
  }

  // Kbd forwards no ref, so the tooltip anchors on a wrapper instead.
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="inline-flex">{cap}</span>
      </TooltipTrigger>
      <TooltipContent>{token.tooltip}</TooltipContent>
    </Tooltip>
  );
}

function ShortcutRow({ shortcut }: { shortcut: Shortcut }) {
  return (
    <Inline data-testid={settingsShortcutRow} gap="sm" justify="between">
      <dt>
        <Text as="span" className={shortcut.style && LABEL_CLASSES[shortcut.style]} size="sm">
          {shortcut.label}
        </Text>
      </dt>
      <dd>
        <KbdGroup>
          {shortcut.keys.map((token) => (
            <KeyCap key={token.text} token={token} />
          ))}
        </KbdGroup>
      </dd>
    </Inline>
  );
}

/** The editor's keyboard shortcuts, as a reference the writer reads rather than edits. */
export function KeyboardShortcutsSection() {
  const groups = useMemo(() => keyboardShortcutGroups(isMacPlatform()), []);

  return (
    <SettingsSubview
      closeLabel="Close keyboard shortcuts panel"
      icon={<LucideIcon.Keyboard />}
      id="keyboard-shortcuts"
      label="Keyboard shortcuts"
      title="Keyboard shortcuts"
    >
      {groups.map((group) => (
        <Stack key={group.title} gap="sm">
          <Text as="h3" size="sm" weight="medium">
            {group.title}
          </Text>
          <dl className="flex flex-col gap-2">
            {group.shortcuts.map((shortcut) => (
              <ShortcutRow key={shortcut.label} shortcut={shortcut} />
            ))}
          </dl>
        </Stack>
      ))}
    </SettingsSubview>
  );
}
