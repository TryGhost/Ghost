import { type ReactNode } from "react";
import { Button } from "@tryghost/shade/components";
import { getGhostPaths } from "@tryghost/admin-x-framework/helpers";
import { trackEvent, useQueryClient } from "@tryghost/admin-x-framework";
import { useBrowseConfig } from "@tryghost/admin-x-framework/api/config";
import { useDeleteAllContent } from "@tryghost/admin-x-framework/api/db";
import { useRemoveAllGiftLinks } from "@tryghost/admin-x-framework/api/gift-links";
import { useResetAuth } from "@tryghost/admin-x-framework/api/security";

import { SettingGroup } from "@/settings/app/shared/setting-group";
import { showToast, useSettingsHandleError } from "@/settings/app/shared/toast";
import { useConfirmation } from "@/settings/app/shared/use-confirmation";
import { useStaffUsers } from "@/settings/app/shared/use-staff-users";

/**
 * The Danger zone group, ported from the legacy advanced/danger-zone.tsx:
 * delete all content, reset all authentication (labs-gated), and reset all
 * gift links — each behind a destructive confirmation.
 */

function DangerZoneItem({ title, detail, action, testId }: { title: string; detail: string; action: ReactNode; testId: string }) {
    return (
        <div className="flex items-center justify-between gap-4 py-3" data-testid={testId}>
            <div className="min-w-0">
                <div className="text-sm font-medium">{title}</div>
                <div className="mt-0.5 text-sm text-muted-foreground">{detail}</div>
            </div>
            <div className="shrink-0">{action}</div>
        </div>
    );
}

export function DangerZoneGroup({ keywords }: { keywords: string[] }) {
    const { mutateAsync: deleteAllContent } = useDeleteAllContent();
    const { mutateAsync: resetAuth } = useResetAuth();
    const { mutateAsync: removeAllGiftLinks } = useRemoveAllGiftLinks();
    const client = useQueryClient();
    const handleError = useSettingsHandleError();
    const { confirm } = useConfirmation();
    const { data: configData } = useBrowseConfig();
    const { totalUsers } = useStaffUsers();

    const resetAuthEnabled = Boolean(configData?.config?.labs?.dangerZoneResetAuth);

    const resetAuthStaffSentence = totalUsers === 1
        ? "You will be signed out and must reset your password before signing back in."
        : totalUsers > 1
            ? `All ${totalUsers} staff users, including you, will be signed out and must reset their password before signing back in.`
            : "All staff users, including you, will be signed out and must reset their password before signing back in.";

    const handleDeleteAllContent = () => {
        confirm({
            title: "Would you really like to delete all content from your blog?",
            prompt: "This is permanent! No backups, no restores, no magic undo button. We warned you, k?",
            okLabel: "Delete",
            destructive: true,
            onOk: async () => {
                try {
                    await deleteAllContent(null);
                    showToast({ title: "All content deleted from database.", type: "success" });
                } catch (e) {
                    handleError(e);
                    throw e;
                }
                await client.refetchQueries();
            },
        });
    };

    const handleResetAuth = () => {
        confirm({
            title: "Reset all authentication?",
            prompt: (
                <>
                    <p className="mb-4">
                        This rotates every API key on your site. Any integration using one will stop working until you reconfigure it with the new key from <strong>Settings → Advanced → Integrations</strong>.
                    </p>
                    <p>
                        {resetAuthStaffSentence} Your members aren&apos;t affected.
                    </p>
                </>
            ),
            okLabel: "Reset all authentication",
            okRunningLabel: "Resetting...",
            destructive: true,
            onOk: async () => {
                let response;
                try {
                    response = await resetAuth(null);
                } catch (e) {
                    handleError(e);
                    throw e;
                }
                const result = response?.security_action?.[0];
                const keys = result?.api_keys_rotated ?? 0;
                const users = result?.users_locked ?? 0;
                showToast({
                    title: `Rotated ${keys} API ${keys === 1 ? "key" : "keys"} and locked ${users} ${users === 1 ? "user" : "users"}. You will be signed out shortly.`,
                    type: "success",
                });
                window.location.href = getGhostPaths().adminRoot;
            },
        });
    };

    const handleRemoveAllGiftLinks = () => {
        confirm({
            title: "Reset all gift links?",
            prompt: "This immediately invalidates every active gift link across your site. Anyone holding one will lose access. New gift links can still be created afterwards.",
            okLabel: "Reset all gift links",
            okRunningLabel: "Resetting...",
            destructive: true,
            onOk: async () => {
                let response;
                try {
                    response = await removeAllGiftLinks(null);
                } catch (e) {
                    handleError(e);
                    throw e;
                }
                const count = response?.meta?.count ?? 0;
                trackEvent("All Gift Links Reset");
                showToast({ title: `Reset ${count} gift ${count === 1 ? "link" : "links"}.`, type: "success" });
            },
        });
    };

    return (
        <SettingGroup
            description="Destructive actions that affect your entire site."
            keywords={keywords}
            navid="dangerzone"
            testId="dangerzone"
            title="Danger zone"
        >
            <div className="flex flex-col divide-y divide-border">
                <DangerZoneItem
                    action={<Button aria-label="Delete all content" variant="destructive" onClick={handleDeleteAllContent}>Delete</Button>}
                    detail="Permanently delete all posts and tags from the database."
                    testId="delete-all-content"
                    title="Delete all content"
                />
                {resetAuthEnabled && (
                    <DangerZoneItem
                        action={<Button aria-label="Reset all authentication" variant="destructive" onClick={handleResetAuth}>Reset</Button>}
                        detail="Rotate every API key, sign out every staff user, and require a password reset. Use after a suspected credential compromise."
                        testId="reset-all-authentication"
                        title="Reset all authentication"
                    />
                )}
                <DangerZoneItem
                    action={<Button aria-label="Reset all gift links" variant="destructive" onClick={handleRemoveAllGiftLinks}>Reset</Button>}
                    detail="Invalidate every active gift link across your site. Anyone holding one will lose access."
                    testId="reset-all-gift-links"
                    title="Reset all gift links"
                />
            </div>
        </SettingGroup>
    );
}
