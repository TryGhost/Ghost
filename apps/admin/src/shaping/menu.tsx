import React, { useEffect, useState, useSyncExternalStore } from 'react';
import {
  Button,
  Field,
  FieldContent,
  FieldDescription,
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
import { Stack, Text } from '@tryghost/shade/primitives';
import { ShadeApp } from '@tryghost/shade/app';
import { LucideIcon, cn } from '@tryghost/shade/utils';
import { SCENARIOS, type ScenarioId, setScenario, useScenario } from './data/scenario';
import { setAnalyticsStyle, useAnalyticsStyle } from './analytics-style';
import { setPatternsView, usePatternsView } from './patterns-view';

// The prototype menu, carried over from the automations build-proto. A 64px
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

export const ShapingMenu: React.FC = () => {
  const [open, setOpen] = useState(false);
  const dark = useSyncExternalStore(subscribeToTheme, isDark);
  const patternsView = usePatternsView();
  const scenario = useScenario();
  const analyticsStyle = useAnalyticsStyle();

  // Close on a press anywhere else, in the capture phase so a screen that
  // stops pointer events can't keep it open. Presses inside the panel or its
  // menus (portalled into their own popper wrappers) don't count.
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
                (open || patternsView) && 'opacity-100',
                open && 'bg-muted',
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
              <Text size="md" weight="semibold">
                Prototype
              </Text>
              <Field className="justify-between" orientation="horizontal">
                <FieldContent>
                  <FieldLabel htmlFor="shaping-patterns-view">View patterns</FieldLabel>
                  <FieldDescription>
                    Swap Analytics for every building block, with sample data.
                  </FieldDescription>
                </FieldContent>
                <Switch
                  checked={patternsView}
                  id="shaping-patterns-view"
                  onCheckedChange={setPatternsView}
                />
              </Field>
              <Field className="justify-between" orientation="horizontal">
                <FieldContent>
                  <FieldLabel htmlFor="shaping-analytics-style">Admin 7 analytics</FieldLabel>
                  <FieldDescription>
                    The new analytics style. Off shows today’s, for comparison.
                  </FieldDescription>
                </FieldContent>
                <Switch
                  checked={analyticsStyle}
                  id="shaping-analytics-style"
                  onCheckedChange={setAnalyticsStyle}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="shaping-scenario">Data</FieldLabel>
                <Select
                  value={scenario}
                  onValueChange={(value) => setScenario(value as ScenarioId)}
                >
                  <SelectTrigger id="shaping-scenario">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SCENARIOS.map((option) => (
                      <SelectItem key={option.id} value={option.id}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FieldDescription>
                  Fakes Analytics’ numbers on every screen. Changing it reloads the page.
                </FieldDescription>
              </Field>
            </Stack>
          </PopoverContent>
        </Popover>
      </div>
    </ShadeApp>
  );
};
