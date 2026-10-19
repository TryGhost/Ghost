import React, { useEffect, useState, useSyncExternalStore } from 'react';
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Field,
  FieldLabel,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Switch,
} from '@tryghost/shade/components';
import { Inline, Stack, Text } from '@tryghost/shade/primitives';
import { ShadeApp } from '@tryghost/shade/app';
import { LucideIcon, cn } from '@tryghost/shade/utils';
import {
  readFakeStripe,
  readFakeTracking,
  resetMockData,
  switchFakeStripe,
  switchFakeTracking,
  switchMocks,
} from './mode';
import {
  EMAIL_CARD_VARIANTS,
  type EmailCardVariant,
  setEmailCardVariant,
  useEmailCardVariant,
} from './variants';

// The prototype menu: the old prototype's hot corner, carried over. A 64px
// square in the bottom-right corner is the hover target; the beaker inside it
// fades in while the pointer is over the square, while it has keyboard focus,
// or while its panel is open. Scaffolding, so it stays out of sight until it's
// wanted.
//
// Its own React root, outside Admin's, so the screens being shaped never know
// it's there (mounted by mount-menu.tsx). ShadeApp gives it Shade's styles
// and follows Admin's dark mode.

const subscribeToTheme = (onChange: () => void) => {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
  return () => observer.disconnect();
};
const isDark = () => document.documentElement.classList.contains('dark');

export const ShapingMenu: React.FC<{ mocked: boolean }> = ({ mocked }) => {
  const [open, setOpen] = useState(false);
  const dark = useSyncExternalStore(subscribeToTheme, isDark);
  const fakeStripe = readFakeStripe();
  const emailCardVariant = useEmailCardVariant();

  // Close on a press anywhere else. Radix listens for that on the document,
  // but the canvas stops pointer events before they get there, so listen in
  // the capture phase. Presses inside the panel or its menus (portalled into
  // their own popper wrappers) don't count.
  useEffect(() => {
    if (!open) {
      return;
    }
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Element | null;
      if (!target?.closest('[data-radix-popper-content-wrapper], [data-shaping-menu]')) {
        setOpen(false);
      }
    };
    document.addEventListener('pointerdown', onPointerDown, true);
    return () => document.removeEventListener('pointerdown', onPointerDown, true);
  }, [open]);

  return (
    <ShadeApp className="shade-admin" darkMode={dark} isAdmin7>
      <div className="group/proto fixed right-0 bottom-0 z-[60] flex size-16 items-end justify-end p-4">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              aria-label="Prototype"
              className={cn(
                'text-muted-foreground opacity-0 transition-opacity group-hover/proto:opacity-100 focus-visible:opacity-100 motion-reduce:transition-none',
                open && 'bg-muted opacity-100',
              )}
              size="icon"
              type="button"
              variant="ghost"
            >
              <LucideIcon.FlaskConical strokeWidth={2} />
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-80" side="top">
            <Stack gap="lg">
              {/* The title names the surface; the ⋯ beside it holds what acts on
                  the prototype as a whole rather than sets something in it. */}
              <Inline align="center" justify="between">
                <Text size="md" weight="semibold">
                  Prototype
                </Text>
                <DropdownMenu modal={false}>
                  <DropdownMenuTrigger asChild>
                    <Button
                      aria-label="Prototype actions"
                      size="icon"
                      type="button"
                      variant="ghost"
                    >
                      <LucideIcon.MoreHorizontal />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem disabled={!mocked} onClick={resetMockData}>
                      <LucideIcon.RotateCcw /> Reset mock data
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </Inline>
              <Field className="justify-between" orientation="horizontal">
                <FieldLabel htmlFor="shaping-mock-data">Mock data</FieldLabel>
                <Switch
                  checked={mocked}
                  id="shaping-mock-data"
                  onCheckedChange={(checked) => switchMocks(checked ? 'on' : 'off')}
                />
              </Field>
              {/* A fake, so it needs mock data on. */}
              <Field
                className="justify-between"
                data-disabled={!mocked || undefined}
                orientation="horizontal"
              >
                <FieldLabel htmlFor="shaping-fake-stripe">Stripe connected</FieldLabel>
                <Switch
                  checked={mocked && fakeStripe}
                  disabled={!mocked}
                  id="shaping-fake-stripe"
                  onCheckedChange={switchFakeStripe}
                />
              </Field>
              {(
                [
                  ['opens', 'Email opens'],
                  ['clicks', 'Email clicks'],
                ] as const
              ).map(([setting, label]) => (
                <Field
                  key={setting}
                  className="justify-between"
                  data-disabled={!mocked || undefined}
                  orientation="horizontal"
                >
                  <FieldLabel htmlFor={`shaping-track-${setting}`}>{label}</FieldLabel>
                  <Switch
                    checked={mocked ? readFakeTracking(setting) : false}
                    disabled={!mocked}
                    id={`shaping-track-${setting}`}
                    onCheckedChange={(checked) => switchFakeTracking(setting, checked)}
                  />
                </Field>
              ))}
              <Field>
                <FieldLabel htmlFor="shaping-email-card">Email card</FieldLabel>
                <Select
                  value={emailCardVariant}
                  onValueChange={(value) => setEmailCardVariant(value as EmailCardVariant)}
                >
                  <SelectTrigger id="shaping-email-card">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {EMAIL_CARD_VARIANTS.map((variant) => (
                      <SelectItem key={variant.id} value={variant.id}>
                        {variant.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </Stack>
          </PopoverContent>
        </Popover>
      </div>
    </ShadeApp>
  );
};
