import {
    Button,
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    Input
} from '@tryghost/shade/components';
import {getMemberSigninUrls} from '@tryghost/admin-x-framework/api/members';
import {getSettingValue, useBrowseSettings} from '@tryghost/admin-x-framework/api/settings';
import {useBrowseConfig} from '@tryghost/admin-x-framework/api/config';
import {useEffect, useRef, useState} from 'react';
import type {Member} from '@tryghost/admin-x-framework/api/members';

function copyTextToClipboard(text: string) {
    if (navigator.clipboard?.writeText) {
        return navigator.clipboard.writeText(text);
    }

    // fallback for non-secure contexts
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
    return Promise.resolve();
}

/**
 * Impersonation modal: fetches the member's signin URL and lets the user copy
 * it. Port of the Ember modal-impersonate-member component.
 */
export function ImpersonateMemberDialog({member, open, onOpenChange}: {
    member: Member;
    open: boolean;
    onOpenChange: (isOpen: boolean) => void;
}) {
    const {data: settingsData} = useBrowseSettings();
    const {data: configData} = useBrowseConfig();
    const siteTitle = getSettingValue<string>(settingsData?.settings ?? null, 'title') ?? '';
    const blogUrl = configData?.config.blogUrl ?? '';

    const {data: signinUrlsData, refetch: refetchSigninUrl} = getMemberSigninUrls(member.id, {
        enabled: open,
        cacheTime: 0,
        defaultErrorHandler: false
    });
    const signinUrl = signinUrlsData?.member_signin_urls?.[0]?.url ?? '';

    // The query observer stays mounted while the dialog is closed, so neither
    // `enabled` nor `cacheTime` cause a refetch on reopen and the global
    // staleTime would serve an old link. Force a fresh fetch on every open
    // (refetch bypasses staleness; react-query dedupes the initial fetch).
    useEffect(() => {
        if (open) {
            refetchSigninUrl();
        }
    }, [open, refetchSigninUrl]);

    const [copied, setCopied] = useState(false);
    const copyTimeoutRef = useRef<ReturnType<typeof setTimeout>>();

    useEffect(() => () => clearTimeout(copyTimeoutRef.current), []);

    useEffect(() => {
        if (!open) {
            setCopied(false);
        }
    }, [open]);

    const handleCopy = async () => {
        if (!signinUrl) {
            return;
        }
        await copyTextToClipboard(signinUrl);
        setCopied(true);
        clearTimeout(copyTimeoutRef.current);
        copyTimeoutRef.current = setTimeout(() => setCopied(false), 1000);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-xl">
                <DialogHeader>
                    <DialogTitle>Impersonate</DialogTitle>
                    <DialogDescription>
                        This is an authentication link to sign into <strong>{siteTitle}</strong> as <strong>{member.email}</strong>,
                        you can send it to them if they need it, or use it to sign into their account for customer support.
                    </DialogDescription>
                </DialogHeader>
                <div className="flex items-center gap-2">
                    <Input
                        aria-label="Member sign-in URL"
                        data-testid="member-signin-url"
                        placeholder={`${blogUrl}/members/?token=...`}
                        value={signinUrl}
                        readOnly
                    />
                    <Button className="shrink-0" disabled={!signinUrl} type="button" onClick={handleCopy}>
                        {copied ? 'Link copied' : 'Copy link'}
                    </Button>
                </div>
                <p className="text-center text-sm text-muted-foreground">
                    This link is only valid for the next <strong>24 hours</strong>
                </p>
            </DialogContent>
        </Dialog>
    );
}
