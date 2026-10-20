import React from 'react';
import {
  Field,
  FieldLabel,
  Input,
  Textarea,
  ToggleGroup,
  ToggleGroupItem,
} from '@tryghost/shade/components';
import { Inline, Stack } from '@tryghost/shade/primitives';
import { LucideIcon, cn } from '@tryghost/shade/utils';
import type { AutomationSendWebhookAction } from '@tryghost/admin-x-framework/api/automations';
import { getWebhookError } from '@/automations/utils/webhook-validation';
import { AutomationCard, AutomationCardHeader } from './automation-card';
import { AutomationCardWarning } from './automation-card-warning';
import { AutomationCardMenu } from './automation-card-menu';
import type { NodeContextMenuEntry } from './nodes';

type WebhookConfig = AutomationSendWebhookAction['data'];

export type EditableWebhookData = WebhookConfig & {
  onInteract: () => void;
  onUpdate: (data: Partial<WebhookConfig>) => void;
};

const METHODS: WebhookConfig['method'][] = ['POST', 'PUT'];

export const EditableWebhookCard: React.FC<
  React.PropsWithChildren<{
    webhook: EditableWebhookData;
    isNew: boolean;
    errorMessage?: string;
    menuItems: NodeContextMenuEntry[];
  }>
> = ({ webhook, isNew, errorMessage, menuItems, children }) => {
  const warning = getWebhookError(webhook) ?? errorMessage;
  return (
    <AutomationCard
      aria-label="Send webhook"
      className={cn(
        'nodrag nopan w-[400px] text-left',
        warning && 'border-state-warning',
        isNew && 'animate-in duration-250 ease-out fade-in-0 zoom-in-90 motion-reduce:animate-none',
      )}
      onClick={(event) => event.stopPropagation()}
      onDoubleClick={(event) => event.stopPropagation()}
      onFocusCapture={webhook.onInteract}
      onPointerDownCapture={webhook.onInteract}
    >
      {children}
      <AutomationCardHeader
        actions={
          <Inline gap="xs">
            <AutomationCardWarning message={warning} />
            <AutomationCardMenu label="Webhook actions" menuItems={menuItems} />
          </Inline>
        }
        icon={<LucideIcon.Webhook className="size-4" />}
        iconClassName="p-2.5 text-foreground"
        title="Send webhook"
      />
      <Stack gap="md">
        <Field>
          <FieldLabel>Method</FieldLabel>
          <ToggleGroup
            aria-label="HTTP method"
            className="w-fit border border-border/60"
            shape="rounded"
            type="single"
            value={webhook.method}
            onValueChange={(value) => {
              const method = METHODS.find((item) => item === value);
              if (method) {
                webhook.onUpdate({ method });
              }
            }}
          >
            {METHODS.map((method) => (
              <ToggleGroupItem key={method} className="px-3" value={method}>
                {method}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </Field>
        <Field>
          <FieldLabel>URL</FieldLabel>
          <Input
            aria-label="Webhook URL"
            placeholder="https://example.com/webhook"
            type="url"
            value={webhook.url}
            onChange={(event) => webhook.onUpdate({ url: event.target.value })}
          />
        </Field>
        <Field>
          <FieldLabel>JSON body</FieldLabel>
          <Textarea
            aria-label="Webhook JSON body"
            className="min-h-32 font-mono text-xs"
            value={webhook.body}
            onChange={(event) => webhook.onUpdate({ body: event.target.value })}
          />
        </Field>
      </Stack>
    </AutomationCard>
  );
};
