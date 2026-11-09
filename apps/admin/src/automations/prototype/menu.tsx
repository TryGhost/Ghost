// PROTOTYPE ONLY (NY-1750): the prototype menu, carried over from the build-proto branch's hot
// corner. Don't merge this folder.
//
// A 64px square in the bottom-right corner is the hover target; the beaker inside it fades in
// while the pointer is over the square, while it has keyboard focus, or while its panel is open.
// Its own React root, outside Admin's (mounted by mount-menu.tsx), so the screens being shown
// never know it's there. ShadeApp gives it Shade's styles and follows Admin's dark mode.
import React, { useEffect, useState, useSyncExternalStore } from 'react';
import {
  Button,
  Field,
  FieldDescription,
  FieldContent,
  FieldLabel,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Switch,
} from '@tryghost/shade/components';
import { Stack, Text } from '@tryghost/shade/primitives';
import { ShadeApp } from '@tryghost/shade/app';
import { LucideIcon, cn } from '@tryghost/shade/utils';
import { setStripeConnected, usePrototypeStripeConnected } from './settings';

const subscribeToTheme = (onChange: () => void) => {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
  return () => observer.disconnect();
};
const isDark = () => document.documentElement.classList.contains('dark');

const Section: React.FC<React.PropsWithChildren<{ title: string }>> = ({ title, children }) => (
  <Stack gap="sm">
    <Text size="sm" tone="secondary" weight="medium">
      {title}
    </Text>
    {children}
  </Stack>
);

export const PrototypeMenu: React.FC = () => {
  const [open, setOpen] = useState(false);
  const dark = useSyncExternalStore(subscribeToTheme, isDark);
  const stripeConnected = usePrototypeStripeConnected();

  // Close on a press anywhere else. Radix listens for that on the document, but the canvas stops
  // pointer events before they get there, so listen in the capture phase. Presses inside the
  // panel or its menus (portalled into their own popper wrappers) don't count.
  useEffect(() => {
    if (!open) {
      return;
    }
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Element | null;
      if (!target?.closest('[data-radix-popper-content-wrapper], [data-prototype-menu]')) {
        setOpen(false);
      }
    };
    document.addEventListener('pointerdown', onPointerDown, true);
    return () => document.removeEventListener('pointerdown', onPointerDown, true);
  }, [open]);

  return (
    <ShadeApp className="shade-admin" darkMode={dark}>
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
              <Text size="md" weight="semibold">
                Prototype
              </Text>
              <Section title="Site">
                <Field className="justify-between" orientation="horizontal">
                  <FieldContent>
                    <FieldLabel htmlFor="prototype-stripe">Stripe connected</FieldLabel>
                    <FieldDescription>Off: only free and label triggers</FieldDescription>
                  </FieldContent>
                  <Switch
                    checked={stripeConnected}
                    id="prototype-stripe"
                    onCheckedChange={setStripeConnected}
                  />
                </Field>
              </Section>
              <Section title="Pages">
                <Button
                  className="-mx-2 justify-start px-2"
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    window.location.hash = '#/automations/triggers';
                    setOpen(false);
                  }}
                >
                  <LucideIcon.LayoutGrid /> Trigger patterns
                </Button>
              </Section>
            </Stack>
          </PopoverContent>
        </Popover>
      </div>
    </ShadeApp>
  );
};
