import { useEffect, useState } from "react";
import {
    Button,
    Dialog,
    DialogContent,
    DialogTitle,
    Field,
    FieldError,
    FieldLabel,
    Switch,
    Textarea,
} from "@tryghost/shade/components";
import { LucideIcon, cn } from "@tryghost/shade/utils";
import { JSONError } from "@tryghost/admin-x-framework/errors";
import {
    checkStripeEnabled,
    getSettingValue,
    getSettingValues,
    useBrowseSettings,
    useDeleteStripeSettings,
    useEditSettings,
} from "@tryghost/admin-x-framework/api/settings";
import { getGhostPaths } from "@tryghost/admin-x-framework/helpers";
import { useBrowseConfig } from "@tryghost/admin-x-framework/api/config";
import { useBrowseMembers } from "@tryghost/admin-x-framework/api/members";
import { useBrowseTiers, useEditTier } from "@tryghost/admin-x-framework/api/tiers";
import { useNavigate } from "@tryghost/admin-x-framework";

import BookmarkThumb from "./assets/stripe-thumb.jpg";
import GhostLogo from "./assets/orb-squircle.png";
import GhostLogoPink from "./assets/orb-pink.png";
import StripeLogo from "./assets/stripe-emblem.svg";
import StripeVerifiedBadge from "./assets/stripe-verified.svg";
import { StripeButton } from "./stripe-buttons";
import { TextField } from "@/settings/app/shared/text-field";
import { confirmIfDirty, useConfirmation } from "@/settings/app/shared/use-confirmation";
import { showToast, useSettingsHandleError } from "@/settings/app/shared/toast";
import { HostLimitError, useLimiter } from "@/settings/app/shared/use-limiter";
import { useSettingGroup } from "@/settings/app/shared/use-setting-group";

/**
 * The routed Stripe connect dialog (`/settings/stripe-connect`), ported from
 * the legacy stripe/stripe-connect-modal.tsx with all four states: the intro,
 * the Connect token flow (with test mode), the connected state (with
 * disconnect) and Stripe Direct keys.
 */

const RETRY_PRODUCT_SAVE_POLL_LENGTH = 1000;
const RETRY_PRODUCT_SAVE_MAX_POLL = 15 * RETRY_PRODUCT_SAVE_POLL_LENGTH;

function Start({ onNext }: { onNext: () => void }) {
    return (
        <div>
            <div className="flex items-center justify-between">
                <h3 className="text-xl font-semibold tracking-tight">Getting paid</h3>
                <img alt="Stripe Verified Partner Badge" src={StripeVerifiedBadge} />
            </div>
            <div className="mt-6 mb-7">
                Stripe is our exclusive direct payments partner. Ghost collects <strong>no fees</strong> on any payments! If you don&rsquo;t have a Stripe account yet, you can <a className="underline" href="https://stripe.com" rel="noopener noreferrer" target="_blank">sign up here</a>.
            </div>
            <StripeButton label={<>I have a Stripe account, let&apos;s go &rarr;</>} onClick={onNext} />
        </div>
    );
}

function Connect() {
    const [submitEnabled, setSubmitEnabled] = useState(false);
    const [token, setToken] = useState("");
    const [testMode, setTestMode] = useState(false);
    const [error, setError] = useState("");

    const { refetch: fetchActiveTiers } = useBrowseTiers({
        searchParams: { filter: "type:paid+active:true" },
        enabled: false,
    });
    const { mutateAsync: editTier } = useEditTier();
    const { mutateAsync: editSettings } = useEditSettings();
    const handleError = useSettingsHandleError();

    const onTokenChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
        setToken(event.target.value);
        setSubmitEnabled(Boolean(event.target.value));
    };

    const saveTier = async () => {
        const { data } = await fetchActiveTiers();
        const tier = data?.pages[0].tiers[0];

        if (tier) {
            tier.monthly_price = 500;
            tier.yearly_price = 5000;
            tier.currency = "USD";

            let pollTimeout = 0;
            /** To allow Stripe config to be ready in backend, we poll the save tier request */
            while (pollTimeout < RETRY_PRODUCT_SAVE_MAX_POLL) {
                await new Promise((resolve) => {
                    setTimeout(resolve, RETRY_PRODUCT_SAVE_POLL_LENGTH);
                });

                try {
                    await editTier(tier);
                    break;
                } catch (e) {
                    if (e instanceof JSONError && e.data?.errors?.[0].code === "STRIPE_NOT_CONFIGURED") {
                        pollTimeout += RETRY_PRODUCT_SAVE_POLL_LENGTH;
                        // will try saving again as stripe is not ready
                        continue;
                    } else {
                        handleError(e);
                        return;
                    }
                }
            }
        }
    };

    const onSubmit = async () => {
        setError("");

        if (token) {
            try {
                await editSettings([{ key: "stripe_connect_integration_token", value: token }]);

                await saveTier();

                await editSettings([{ key: "portal_plans", value: JSON.stringify(["free", "monthly", "yearly"]) }]);
            } catch (e) {
                if (e instanceof JSONError && e.data?.errors) {
                    setError("Invalid secure key");
                    return;
                } else {
                    handleError(e);
                    return;
                }
            }
        } else {
            setError("Please enter a secure key");
        }
    };

    const { apiRoot } = getGhostPaths();
    const stripeConnectUrl = `${apiRoot}/members/stripe_connect?mode=${testMode ? "test" : "live"}`;

    return (
        <div>
            <div className="mb-6 flex items-center justify-between">
                <h3 className="text-xl font-semibold tracking-tight">Connect with Stripe</h3>
                <Field className="w-auto" orientation="horizontal">
                    <FieldLabel className={testMode ? "text-orange-500" : "text-muted-foreground"} htmlFor="stripe-test-mode">Test mode</FieldLabel>
                    <Switch checked={testMode} className="data-[state=checked]:bg-orange-500!" id="stripe-test-mode" onCheckedChange={setTestMode} />
                </Field>
            </div>
            <h6 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Step 1 — <span className="text-foreground">Generate secure key</span></h6>
            <div className="mt-2 mb-4">
                Click on the <strong>&ldquo;Connect with Stripe&rdquo;</strong> button to generate a secure key that connects your Ghost site with Stripe.
            </div>
            <StripeButton href={stripeConnectUrl} target="_blank" />
            <h6 className="mt-8 mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">Step 2 — <span className="text-foreground">Paste secure key</span></h6>
            <Field data-invalid={Boolean(error) || undefined}>
                <FieldLabel className="sr-only" htmlFor="stripe-secure-key">Secure key</FieldLabel>
                <Textarea aria-invalid={Boolean(error) || undefined} className="border-transparent bg-muted" id="stripe-secure-key" placeholder="Paste your secure key here" onChange={onTokenChange} />
                {error && <FieldError>{error}</FieldError>}
            </Field>
            {submitEnabled && <Button className="mt-5 bg-state-success text-white hover:bg-state-success/90" onClick={() => void onSubmit()}>Save Stripe settings</Button>}
        </div>
    );
}

function Connected({ onClose }: { onClose: () => void }) {
    const { confirm } = useConfirmation();
    const { data: settingsData } = useBrowseSettings();
    const settings = settingsData?.settings ?? [];
    const [stripeConnectAccountName, stripeConnectLivemode] = getSettingValues(settings, ["stripe_connect_display_name", "stripe_connect_livemode"]);

    const { refetch: fetchMembers, isFetching: isFetchingMembers } = useBrowseMembers({
        searchParams: { filter: "status:paid", limit: "0" },
        enabled: false,
    });

    const { mutateAsync: deleteStripeSettings } = useDeleteStripeSettings();
    const handleError = useSettingsHandleError();

    const openDisconnectStripeModal = async () => {
        const { data } = await fetchMembers();
        const hasActiveStripeSubscriptions = Boolean(data?.meta?.pagination.total);

        confirm({
            title: "Disconnect Stripe",
            prompt: hasActiveStripeSubscriptions
                ? "Cannot disconnect while there are members with active Stripe subscriptions."
                : <>You&lsquo;re about to disconnect your Stripe account {stripeConnectAccountName} from this site. This will automatically turn off paid memberships on this site.</>,
            okLabel: hasActiveStripeSubscriptions ? "" : "Disconnect",
            destructive: true,
            onOk: async () => {
                try {
                    await deleteStripeSettings(null);
                    onClose();
                } catch (e) {
                    handleError(e);
                    throw e;
                }
            },
        });
    };

    return (
        <section>
            <div className="flex items-center justify-between">
                <Button className="px-0 text-destructive hover:bg-transparent hover:underline" disabled={isFetchingMembers} variant="ghost" onClick={() => void openDisconnectStripeModal()}>
                    <LucideIcon.Unlink className="size-4" />
                    Disconnect
                </Button>
                <Button aria-label="Close" size="icon" variant="ghost" onClick={onClose}>
                    <LucideIcon.X className="size-4" />
                </Button>
            </div>
            <div className="my-20 flex flex-col items-center">
                <div className="relative h-20 w-[200px]">
                    <img alt="Ghost Logo" className="absolute left-10 size-16" src={GhostLogo} />
                    <img alt="Stripe Logo" className="absolute right-10 size-16 rounded-2xl shadow-[-1.5px_0_0_1.5px_var(--background)]" src={StripeLogo} />
                </div>
                <h3 className="text-center text-xl font-semibold tracking-tight">You are connected with Stripe!{stripeConnectLivemode ? null : " (Test mode)"}</h3>
                <div className="mt-1">Connected to <strong>{stripeConnectAccountName ? String(stripeConnectAccountName) : "Test mode"}</strong></div>
            </div>
            <div className="flex flex-col items-center">
                <h6 className="text-xs font-semibold tracking-wide uppercase">Read next</h6>
                <a className="mt-5 flex w-full max-w-[400px] flex-col items-stretch justify-between overflow-hidden rounded-md border border-border transition-all hover:border-border-strong md:flex-row" href="https://ghost.org/resources/managing-your-stripe-account/?ref=admin" rel="noopener noreferrer" target="_blank">
                    <div className="order-2 p-4 md:order-1">
                        <div className="text-md font-semibold">How to setup and manage your Stripe account</div>
                        <div className="mt-2 text-muted-foreground">Learn how to configure your Stripe account to work with Ghost, from custom branding to payment receipt emails.</div>
                        <div className="mt-3 flex items-center gap-1 text-muted-foreground">
                            <img alt="Ghost Logo" className="size-4" src={GhostLogoPink} />
                            <span className="font-semibold">Ghost Resources</span>
                        </div>
                    </div>
                    <div className="order-1 hidden w-[200px] shrink-0 items-center justify-center overflow-hidden md:order-2 md:flex">
                        <img alt="Bookmark Thumb" className="min-h-full min-w-full shrink-0" src={BookmarkThumb} />
                    </div>
                </a>
            </div>
        </section>
    );
}

function Direct({ onClose }: { onClose: () => void }) {
    const { localSettings, updateSetting, handleSave, saveState } = useSettingGroup();
    const [publishableKey, secretKey] = getSettingValues(localSettings, ["stripe_publishable_key", "stripe_secret_key"]);

    const onSubmit = async () => {
        try {
            await handleSave();
            onClose();
        } catch (e) {
            if (e instanceof JSONError) {
                showToast({
                    title: "Failed to save settings",
                    type: "error",
                    message: "Check you copied both keys correctly",
                });
                return;
            }

            throw e;
        }
    };

    return (
        <div>
            <h3 className="text-xl font-semibold tracking-tight">Connect Stripe</h3>
            <div className="mt-6 flex flex-col gap-6">
                <TextField title="Publishable key" value={publishableKey?.toString() ?? ""} onChange={(e) => updateSetting("stripe_publishable_key", e.target.value)} />
                <TextField title="Secure key" value={secretKey?.toString() ?? ""} onChange={(e) => updateSetting("stripe_secret_key", e.target.value)} />
                <Button className="mt-5 self-start bg-state-success text-white hover:bg-state-success/90" disabled={saveState === "saving"} onClick={() => void onSubmit()}>Save Stripe settings</Button>
            </div>
        </div>
    );
}

function StripeConnectDialogContent() {
    const navigate = useNavigate();
    const { showLimit } = useConfirmation();
    const { confirm } = useConfirmation();
    const { data: settingsData } = useBrowseSettings();
    const { data: configData } = useBrowseConfig();
    const settings = settingsData?.settings ?? [];
    const config = configData?.config;
    const stripeConnectAccountId = getSettingValue<string>(settings, "stripe_connect_account_id");
    const [step, setStep] = useState<"start" | "connect">("start");
    const [dismissedByLimit, setDismissedByLimit] = useState(false);
    const limiter = useLimiter();

    const stripeEnabled = config ? checkStripeEnabled(settings, config) : false;
    const hasStripeConnectLimit = limiter.isDisabled("limitStripeConnect");

    const close = () => {
        navigate("/settings/tiers");
    };

    useEffect(() => {
        const checkLimit = async () => {
            // Allow Stripe despite the limit when it's already connected, so
            // it's possible to disconnect or update the settings.
            if (hasStripeConnectLimit && !stripeEnabled) {
                try {
                    await limiter.errorIfWouldGoOverLimit("limitStripeConnect");
                } catch (error) {
                    if (error instanceof HostLimitError) {
                        setDismissedByLimit(true);
                        showLimit({
                            prompt: error.message || "Your current plan doesn't support Stripe Connect.",
                            onOk: () => navigate("/pro", { crossApp: true }),
                        });
                        navigate("/settings/tiers", { replace: true });
                    }
                }
            }
        };

        void checkLimit();
    }, [limiter, navigate, showLimit, stripeEnabled, hasStripeConnectLimit]);

    if (dismissedByLimit) {
        return null;
    }

    let contents;

    if (config?.stripeDirect || (
        // Still show Stripe Direct to allow disabling the keys if the config
        // was turned off but stripe direct is still set up
        stripeEnabled && !stripeConnectAccountId
    )) {
        contents = <Direct onClose={close} />;
    } else if (stripeConnectAccountId) {
        contents = <Connected onClose={close} />;
    } else if (step === "start") {
        contents = <Start onNext={() => setStep("connect")} />;
    } else {
        contents = <Connect />;
    }

    return (
        <Dialog open onOpenChange={(isOpen) => {
            if (!isOpen) {
                confirmIfDirty(confirm, false, close);
            }
        }}>
            <DialogContent
                aria-describedby={undefined}
                className={cn("block max-h-[calc(100vh-8vmin)] gap-0 overflow-y-auto p-8", stripeConnectAccountId ? "w-[740px] max-w-[740px]" : "w-[520px] max-w-[520px]")}
                data-testid="stripe-modal"
            >
                <DialogTitle className="sr-only">Stripe</DialogTitle>
                {contents}
            </DialogContent>
        </Dialog>
    );
}

export function StripeConnectDialog() {
    const { data: settingsData } = useBrowseSettings();
    const { data: configData } = useBrowseConfig();

    if (!settingsData || !configData) {
        return null;
    }

    return <StripeConnectDialogContent />;
}
