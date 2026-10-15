import React, { useState, useSyncExternalStore } from 'react';
import {
  Button,
  Checkbox,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Field,
  FieldDescription,
  FieldLabel,
  FieldLegend,
  FieldSet,
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@tryghost/shade/components';
import { Inline, Stack, Text } from '@tryghost/shade/primitives';
import { ShadeApp } from '@tryghost/shade/app';
import { LucideIcon, cn } from '@tryghost/shade/utils';
import { readFakeStripe, resetMockData, switchFakeStripe, switchMocks } from './mode';

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
              <FieldSet className="gap-3">
                <FieldLegend variant="label">Data</FieldLegend>
                <Field orientation="horizontal">
                  <Checkbox
                    checked={mocked}
                    id="shaping-mock-data"
                    onCheckedChange={(checked) => switchMocks(checked === true ? 'on' : 'off')}
                  />
                  <FieldLabel htmlFor="shaping-mock-data">Mock data</FieldLabel>
                </Field>
                <FieldDescription>
                  {mocked
                    ? 'Automations come from demo data in this browser. Everything else is your real site.'
                    : 'Everything is your real site.'}
                </FieldDescription>
              </FieldSet>
              {/* Site conditions the screens react to. Each fakes the site
                  setting it names, and needs mock data on. */}
              <FieldSet className="gap-3">
                <FieldLegend variant="label">Conditions</FieldLegend>
                <Field data-disabled={!mocked || undefined} orientation="horizontal">
                  <Checkbox
                    checked={mocked && fakeStripe}
                    disabled={!mocked}
                    id="shaping-fake-stripe"
                    onCheckedChange={(checked) => switchFakeStripe(checked === true)}
                  />
                  <FieldLabel htmlFor="shaping-fake-stripe">Stripe connected</FieldLabel>
                </Field>
                <FieldDescription>
                  {mocked
                    ? 'Fakes a Stripe connection. Off uses your site’s real Stripe setting.'
                    : 'Turn mock data on to fake site conditions.'}
                </FieldDescription>
              </FieldSet>
            </Stack>
          </PopoverContent>
        </Popover>
      </div>
    </ShadeApp>
  );
};
