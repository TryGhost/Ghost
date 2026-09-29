import { useState, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import { ShadeScope } from '@tryghost/shade/app';
import { Button } from '@tryghost/shade/components';
import { Inline, Stack } from '@tryghost/shade/primitives';
import { LucideIcon, cn } from '@tryghost/shade/utils';
import { RichTextContent } from './rich-text-content';
import type { AlertsStore } from './alerts-store';

export const ALERTS_HOST_ID = 'admin-alerts';

const TYPE_CLASSES: Record<string, string> = {
  success: 'bg-state-success text-state-success-foreground',
  error: 'bg-destructive text-destructive-foreground',
  warn: 'bg-surface-inverse text-surface-inverse-foreground',
  info: 'bg-surface-inverse text-surface-inverse-foreground',
};

const DEFAULT_TYPE_CLASSES = 'border-b border-border bg-background text-foreground';

/** Full-width alert bars above the admin shell; they stay until closed. */
export function AdminAlerts({ store }: { store: AlertsStore }) {
  const alerts = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
  const [host] = useState(() => document.getElementById(ALERTS_HOST_ID));

  if (!host || alerts.length === 0) {
    return null;
  }

  return createPortal(
    <ShadeScope style={{ width: 'unset', height: 'unset' }}>
      <Stack data-testid="admin-alerts" gap="none">
        {alerts.map((alert) => (
          <Inline
            key={alert.id}
            align="center"
            className={cn(
              'px-4 py-3 text-md select-text [&_a]:text-current [&_a]:underline',
              (alert.type && TYPE_CLASSES[alert.type]) || DEFAULT_TYPE_CLASSES,
            )}
            data-testid="admin-alert"
            gap="lg"
            justify="between"
            role="alert"
          >
            <div>
              <RichTextContent value={alert.message} />
            </div>
            <Button
              aria-label="Close"
              className="shrink-0 text-current hover:bg-transparent hover:text-current hover:opacity-70"
              size="icon-sm"
              variant="ghost"
              onClick={() => store.close(alert.id)}
            >
              <LucideIcon.X />
            </Button>
          </Inline>
        ))}
      </Stack>
    </ShadeScope>,
    host,
  );
}
