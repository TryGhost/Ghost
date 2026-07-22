import { useEffect, useRef, useState } from "react";
import {
    Button,
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
} from "@tryghost/shade/components";
import { LucideIcon, formatNumber } from "@tryghost/shade/utils";
import { APIError } from "@tryghost/admin-x-framework/errors";
import { useLocation, useNavigate } from "@tryghost/admin-x-framework";
import { useVerifyAutomatedEmailSender } from "@tryghost/admin-x-framework/api/automated-emails";

import { NewslettersList } from "./newsletters-list";
import { useNewsletters } from "./use-newsletters";
import { useNewsletterVerification } from "./use-newsletter-verification";
import { WelcomeEmailCustomizeDialog } from "@/settings/membership/welcome-email-customize-dialog";
import { SettingGroup } from "@/settings/app/shared/setting-group";
import { useConfirmation } from "@/settings/app/shared/use-confirmation";
import { useSettingsHandleError } from "@/settings/app/shared/toast";

/**
 * The Newsletters & automation emails group (automations flag on), ported
 * from the legacy email/emails.tsx: newsletters/transactional tabs with the
 * active/archived filter, the email-design entry point (the shared welcome
 * email customize dialog) and both verification-token flows.
 */

type NewslettersFilter = "active" | "archived";
type EmailsTab = "newsletters" | "transactional";

function TransactionalTabContent() {
    const [customizeOpen, setCustomizeOpen] = useState(false);

    return (
        <>
            <div className="flex w-full items-center gap-3" data-testid="automations-transactional-row">
                <button
                    className="flex w-full min-w-0 items-center gap-3 py-3 text-left focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none"
                    type="button"
                    onClick={() => setCustomizeOpen(true)}
                >
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted">
                        <LucideIcon.MailPlus className="size-5 text-muted-foreground" />
                    </div>
                    <div className="min-w-0 grow">
                        <div className="leading-tight font-medium">Email design</div>
                        <div className="mt-1 text-sm leading-[1.35] text-muted-foreground">
                            Customize the appearance of automation emails
                        </div>
                    </div>
                </button>
                <button className="shrink-0 font-semibold text-state-success hover:opacity-80" type="button" onClick={() => setCustomizeOpen(true)}>
                    Edit
                </button>
            </div>
            {customizeOpen && <WelcomeEmailCustomizeDialog onClose={() => setCustomizeOpen(false)} />}
        </>
    );
}

/**
 * Redeems a `?verifyEmail=` automated-email sender token, ported from the
 * legacy EmailsGroup effect: only the legacy memberemails route carries these
 * tokens; verification bounces to the emails section before reporting.
 */
function useAutomatedEmailVerification(setSelectedTab: (tab: EmailsTab) => void) {
    const { pathname, search } = useLocation();
    const verifyEmailToken = new URLSearchParams(search).get("verifyEmail");
    const { mutateAsync: verifySenderUpdate } = useVerifyAutomatedEmailSender();
    const { confirm } = useConfirmation();
    const handleError = useSettingsHandleError();
    const navigate = useNavigate();
    const submittedTokenRef = useRef<string | null>(null);

    const isVerificationRoute = pathname.startsWith("/settings/memberemails");

    useEffect(() => {
        if (!verifyEmailToken || !isVerificationRoute) {
            return;
        }

        if (submittedTokenRef.current === verifyEmailToken) {
            return;
        }
        submittedTokenRef.current = verifyEmailToken;
        setSelectedTab("transactional");

        const verify = async () => {
            try {
                const { meta: { email_verified: emailVerified } = {} } = await verifySenderUpdate({ token: verifyEmailToken });

                let title = "Sender email verified";
                let prompt: React.ReactNode = <>Automation email sender settings have been updated.</>;

                if (emailVerified === "sender_reply_to") {
                    title = "Reply-to address verified";
                    prompt = <>Automation email reply-to address has been verified and updated.</>;
                }

                navigate("/settings/emails");
                confirm({ title, prompt, okLabel: "Close", cancelLabel: "", onOk: () => {} });
            } catch (e) {
                let prompt = "There was an error verifying your email address. Try again later.";

                if (e instanceof APIError && e.message === "Token expired") {
                    prompt = "Verification link has expired.";
                }

                navigate("/settings/emails");
                confirm({ title: "Error verifying email address", prompt, okLabel: "Close", cancelLabel: "", onOk: () => {} });
                handleError(e, { withToast: false });
            }
        };

        void verify();
    }, [confirm, handleError, isVerificationRoute, navigate, setSelectedTab, verifyEmailToken, verifySenderUpdate]);
}

export function EmailsGroup({ keywords, newslettersEnabled }: { keywords: string[]; newslettersEnabled: boolean }) {
    const navigate = useNavigate();
    const [selectedTab, setSelectedTab] = useState<EmailsTab>(newslettersEnabled ? "newsletters" : "transactional");
    const [newslettersFilter, setNewslettersFilter] = useState<NewslettersFilter>("active");
    const { newsletters, sortedActiveNewsletters, archivedNewsletters, meta, isEnd, isLoading, fetchNextPage, onSort } = useNewsletters();

    useNewsletterVerification();
    useAutomatedEmailVerification(setSelectedTab);

    useEffect(() => {
        if (!newslettersEnabled && selectedTab === "newsletters") {
            setSelectedTab("transactional");
        }
    }, [newslettersEnabled, selectedTab]);

    const customButtons = newslettersEnabled && selectedTab === "newsletters" ? (
        <Button className="mt-[-5px]" size="sm" variant="ghost" onClick={() => navigate("/settings/newsletters/new")}>
            Add newsletter
        </Button>
    ) : undefined;

    return (
        <SettingGroup
            customButtons={customButtons}
            description="Manage newsletters and design automation emails."
            keywords={keywords}
            navid="emails"
            testId="emails"
            title="Newsletters & automation emails"
        >
            <Tabs value={selectedTab} variant="underline" onValueChange={(value) => setSelectedTab(value as EmailsTab)}>
                <div className="flex items-center justify-between border-b border-border">
                    <TabsList className="border-b-0">
                        {newslettersEnabled && <TabsTrigger value="newsletters">Newsletters</TabsTrigger>}
                        <TabsTrigger value="transactional">Automation emails</TabsTrigger>
                    </TabsList>
                    {newslettersEnabled && selectedTab === "newsletters" && (
                        <Select value={newslettersFilter} onValueChange={(value) => setNewslettersFilter(value as NewslettersFilter)}>
                            <SelectTrigger className="h-7 w-auto gap-1 border-0 bg-transparent px-2 text-sm shadow-none hover:bg-muted focus:ring-0 focus:ring-offset-0" data-testid="newsletters-filter">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="active">Active</SelectItem>
                                <SelectItem value="archived">Archived</SelectItem>
                            </SelectContent>
                        </Select>
                    )}
                </div>
                {newslettersEnabled && (
                    <TabsContent value="newsletters">
                        {newslettersFilter === "active" ? (
                            <NewslettersList isLoading={isLoading} newsletters={sortedActiveNewsletters} isSortable onSort={onSort} />
                        ) : (
                            <NewslettersList isLoading={isLoading} newsletters={archivedNewsletters} />
                        )}
                        {isEnd === false && (
                            <Button className="px-0" variant="ghost" onClick={() => void fetchNextPage()}>
                                {`Load more (showing ${formatNumber(newsletters?.length || 0)}/${formatNumber(meta?.pagination.total || 0)} newsletters)`}
                            </Button>
                        )}
                    </TabsContent>
                )}
                <TabsContent value="transactional">
                    <TransactionalTabContent />
                </TabsContent>
            </Tabs>
        </SettingGroup>
    );
}
