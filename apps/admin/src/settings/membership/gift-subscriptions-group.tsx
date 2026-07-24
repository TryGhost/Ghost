import { Button, CopyField, CopyFieldActions, CopyFieldContent, CopyFieldCopyButton, CopyFieldLabel, CopyFieldValue } from "@tryghost/shade/components";
import { useBrowseSite } from "@tryghost/admin-x-framework/api/site";

import { SettingGroup, SettingGroupContent } from "@/settings/app/shared/setting-group";

/**
 * The Gift subscriptions group, ported from the legacy
 * membership/gift-subscriptions.tsx: the shareable portal gift link.
 */
export function GiftSubscriptionsGroup({ keywords }: { keywords: string[] }) {
    const { data: siteResponse } = useBrowseSite();
    const siteData = siteResponse?.site;
    const giftUrl = `${siteData?.url.replace(/\/$/, "")}/#/portal/gift`;

    return (
        <SettingGroup
            description={<>Allow your readers to share your work by purchasing a gift subscription for a friend or colleague. <a className="text-primary" href="https://ghost.org/help/gift-subscriptions/" rel="noopener noreferrer" target="_blank">Learn more</a></>}
            keywords={keywords}
            navid="gift-subscriptions"
            testId="gift-subscriptions"
            title="Gift subscriptions"
        >
            <SettingGroupContent columns={1}>
                <CopyField value={giftUrl}>
                    <CopyFieldLabel>Shareable link</CopyFieldLabel>
                    <CopyFieldContent>
                        <CopyFieldValue data-testid="gift-url" />
                        <CopyFieldActions>
                            <Button data-testid="preview-shareable-link" size="sm" type="button" variant="ghost" onClick={() => window.open(giftUrl, "_blank")}>Preview</Button>
                            <CopyFieldCopyButton copiedLabel="Copied" data-testid="copy-shareable-link">Copy link</CopyFieldCopyButton>
                        </CopyFieldActions>
                    </CopyFieldContent>
                </CopyField>
            </SettingGroupContent>
        </SettingGroup>
    );
}
