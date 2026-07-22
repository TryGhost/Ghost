import { useState } from "react";
import { getWebhookEventLabel } from "@tryghost/admin-x-settings/src/components/settings/advanced/integrations/webhook-event-options";
import { Button } from "@tryghost/shade/components";
import { LucideIcon, formatNumber } from "@tryghost/shade/utils";
import { type Integration } from "@tryghost/admin-x-framework/api/integrations";
import { type Webhook, useDeleteWebhook } from "@tryghost/admin-x-framework/api/webhooks";

import { WebhookDialog } from "./webhook-dialog";
import { showToast, useSettingsHandleError } from "@/settings/app/shared/toast";
import { useConfirmation } from "@/settings/app/shared/use-confirmation";

/**
 * The webhooks list inside the custom integration dialog, ported from the
 * legacy webhooks-table.tsx: row click edits, hover-reveal delete, and the
 * nested add/edit webhook dialog.
 */
export function WebhooksTable({ integration }: { integration: Integration }) {
    const { mutateAsync: deleteWebhook } = useDeleteWebhook();
    const handleError = useSettingsHandleError();
    const { confirm } = useConfirmation();
    const [editing, setEditing] = useState<{ webhook?: Webhook } | null>(null);

    const handleDelete = (id: string) => {
        confirm({
            title: "Are you sure?",
            prompt: "Deleting this webhook may prevent the integration from functioning.",
            okLabel: "Delete Webhook",
            destructive: true,
            onOk: async () => {
                try {
                    await deleteWebhook(id);
                    showToast({ message: "Webhook deleted", type: "info" });
                } catch (e) {
                    handleError(e);
                    throw e;
                }
            },
        });
    };

    const webhookCount = integration.webhooks?.length || 0;

    return (
        <div>
            <div className="flex w-full border-b border-border py-3 text-sm font-semibold">
                <div className="w-3/4">{formatNumber(webhookCount)} {webhookCount === 1 ? "webhook" : "webhooks"}</div>
                <div className="w-1/4">Last triggered</div>
            </div>
            {integration.webhooks?.map((webhook) => (
                <div
                    key={webhook.id}
                    className="group flex w-full cursor-pointer items-start border-b border-border"
                    onClick={() => setEditing({ webhook })}
                >
                    <div className="w-3/4 py-3 pr-6">
                        <div className="text-sm font-semibold">{webhook.name}</div>
                        <div className="mt-1 grid grid-cols-[max-content_1fr] gap-1 text-sm leading-snug">
                            <span className="text-muted-foreground">Event:</span>
                            <span>{getWebhookEventLabel(webhook.event)}</span>
                            <span className="text-muted-foreground">URL:</span>
                            <span className="line-clamp-3 break-all" title={webhook.target_url}>
                                {webhook.target_url}
                            </span>
                        </div>
                    </div>
                    <div className="flex w-1/4 items-center justify-between gap-2 py-3 text-sm">
                        <span>
                            {webhook.last_triggered_at && new Date(webhook.last_triggered_at).toLocaleString("default", {
                                weekday: "short",
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                                second: "2-digit",
                            })}
                        </span>
                        <Button
                            className="text-destructive group-hover:visible md:invisible"
                            size="sm"
                            variant="ghost"
                            onClick={(e) => {
                                e.stopPropagation();
                                handleDelete(webhook.id);
                            }}
                        >
                            Delete
                        </Button>
                    </div>
                </div>
            ))}
            <div className="mt-5">
                <Button className="text-state-success" size="sm" variant="ghost" onClick={() => setEditing({})}>
                    <LucideIcon.Plus className="size-4" /> Add webhook
                </Button>
            </div>
            {editing && (
                <WebhookDialog
                    integrationId={integration.id}
                    webhook={editing.webhook}
                    onClose={() => setEditing(null)}
                />
            )}
        </div>
    );
}
