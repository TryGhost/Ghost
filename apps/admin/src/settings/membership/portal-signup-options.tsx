import { useCallback, useEffect, useMemo } from "react";
import {
    Checkbox,
    Field,
    FieldDescription,
    FieldError,
    FieldGroup,
    FieldLabel,
    FieldLegend,
    FieldSet,
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
    Switch,
} from "@tryghost/shade/components";
import { type Setting, type SettingValue, checkStripeEnabled, getSettingValues } from "@tryghost/admin-x-framework/api/settings";
import { type Tier, getPaidActiveTiers } from "@tryghost/admin-x-framework/api/tiers";
import { useBrowseConfig } from "@tryghost/admin-x-framework/api/config";

import { AnnouncementContentEditor } from "@/settings/site/announcement-content-editor";

/**
 * The Signup options tab of the portal dialog, ported from the legacy
 * portal/signup-options.tsx: display name, tier visibility checkboxes (free
 * tier syncs portal_plans), price checkboxes with the default plan, and the
 * Koenig signup-notice editor.
 */

type SignupCheckbox = {
    checked: boolean;
    disabled?: boolean;
    label: string;
    onChange: (checked: boolean) => void;
    testId?: string;
    value: string;
};

export function PortalSignupOptions({ localSettings, updateSetting, localTiers, updateTier, errors, setError }: {
    localSettings: Setting[];
    updateSetting: (key: string, setting: SettingValue) => void;
    localTiers: Tier[];
    updateTier: (tier: Tier) => void;
    errors: Record<string, string | undefined>;
    setError: (key: string, error: string | undefined) => void;
}) {
    const { data: configData } = useBrowseConfig();
    const config = configData?.config;
    const [membersSignupAccess, portalName, portalSignupTermsHtml, portalSignupCheckboxRequired, portalPlansJson, portalDefaultPlan] = getSettingValues(
        localSettings, ["members_signup_access", "portal_name", "portal_signup_terms_html", "portal_signup_checkbox_required", "portal_plans", "portal_default_plan"],
    );
    const portalPlans = JSON.parse(portalPlansJson?.toString() || "[]") as string[];

    const signupTermsMaxLength = 115;
    const signupTermsLength = useMemo(() => {
        const div = document.createElement("div");
        div.innerHTML = portalSignupTermsHtml?.toString() || "";
        return div.innerText.length;
    }, [portalSignupTermsHtml]);

    const handleError = useCallback((key: string, error: string | undefined) => {
        setError(key, error);
         
    }, []);

    useEffect(() => {
        if (signupTermsLength > signupTermsMaxLength) {
            handleError("portal_signup_terms_html", "Signup notice is too long");
        } else {
            handleError("portal_signup_terms_html", undefined);
        }
    }, [signupTermsLength, handleError]);

    const togglePlan = (plan: string) => {
        const index = portalPlans.indexOf(plan);

        if (index === -1) {
            portalPlans.push(plan);
        } else {
            portalPlans.splice(index, 1);
        }

        updateSetting("portal_plans", JSON.stringify(portalPlans));

        // Check default plan is included
        if (portalDefaultPlan === "yearly") {
            if (!portalPlans.includes("yearly") && portalPlans.includes("monthly")) {
                updateSetting("portal_default_plan", "monthly");
            }
        } else if (portalDefaultPlan === "monthly") {
            if (!portalPlans.includes("monthly")) {
                // If both yearly and monthly are missing from plans, still set it to yearly
                updateSetting("portal_default_plan", "yearly");
            }
        }
    };

    const isSignupAllowed = membersSignupAccess === "all" || membersSignupAccess === "paid";
    const isFreeSignupAllowed = membersSignupAccess === "all";
    const isStripeEnabled = config ? checkStripeEnabled(localSettings, config) : false;

    const tiersCheckboxes: SignupCheckbox[] = [];

    if (localTiers) {
        localTiers.forEach((tier) => {
            if (tier.type === "free" && isFreeSignupAllowed) {
                tiersCheckboxes.push({
                    checked: (portalPlans.includes("free")),
                    disabled: !isSignupAllowed,
                    label: tier.name,
                    value: "free",
                    testId: "free-tier-checkbox",
                    onChange: (checked) => {
                        if (portalPlans.includes("free") && !checked) {
                            portalPlans.splice(portalPlans.indexOf("free"), 1);
                        }

                        if (!portalPlans.includes("free") && checked) {
                            portalPlans.push("free");
                        }

                        updateSetting("portal_plans", JSON.stringify(portalPlans));

                        updateTier({ ...tier, visibility: checked ? "public" : "none" });
                    },
                });
            }
        });
    }

    const paidActiveTiers = getPaidActiveTiers(localTiers) || [];

    const defaultPlanOptions = [
        { value: "yearly", label: "Yearly" },
        { value: "monthly", label: "Monthly" },
    ];

    if (isStripeEnabled && paidActiveTiers.length > 0) {
        paidActiveTiers.forEach((tier) => {
            tiersCheckboxes.push({
                checked: (tier.visibility === "public"),
                label: tier.name,
                value: tier.id,
                onChange: (checked => updateTier({ ...tier, visibility: checked ? "public" : "none" })),
            });
        });
    }

    const arePaidTiersVisible = isStripeEnabled && paidActiveTiers.length > 0 && paidActiveTiers.some((tier) => tier.visibility === "public");

    return (
        <div className="mt-7 flex flex-col gap-6">
            <Field data-disabled={!isSignupAllowed || undefined} orientation="horizontal">
                <FieldLabel htmlFor="portal-display-name">Display name in signup form</FieldLabel>
                <Switch checked={Boolean(portalName)} disabled={!isSignupAllowed} id="portal-display-name" onCheckedChange={(checked) => updateSetting("portal_name", checked)} />
            </Field>

            <FieldSet>
                <FieldLegend variant="label">Available tiers</FieldLegend>
                <FieldGroup data-slot="checkbox-group">
                    {tiersCheckboxes.map((checkbox) => (
                        <Field key={checkbox.value} data-disabled={checkbox.disabled || undefined} orientation="horizontal">
                            <Checkbox
                                checked={checkbox.checked}
                                data-testid={checkbox.testId}
                                disabled={checkbox.disabled}
                                id={`portal-tier-${checkbox.value}`}
                                onCheckedChange={(checked) => checkbox.onChange(checked === true)}
                            />
                            <FieldLabel htmlFor={`portal-tier-${checkbox.value}`}>{checkbox.label}</FieldLabel>
                        </Field>
                    ))}
                </FieldGroup>
            </FieldSet>

            {arePaidTiersVisible && (
                <>
                    <FieldSet>
                        <FieldLegend variant="label">Available prices</FieldLegend>
                        <FieldGroup data-slot="checkbox-group">
                            {["monthly", "yearly"].map((plan) => (
                                <Field key={plan} data-disabled={!isSignupAllowed || undefined} orientation="horizontal">
                                    <Checkbox
                                        checked={portalPlans.includes(plan)}
                                        disabled={!isSignupAllowed}
                                        id={`portal-plan-${plan}`}
                                        onCheckedChange={() => togglePlan(plan)}
                                    />
                                    <FieldLabel className="capitalize" htmlFor={`portal-plan-${plan}`}>{plan}</FieldLabel>
                                </Field>
                            ))}
                        </FieldGroup>
                    </FieldSet>
                    {(portalPlans.includes("yearly") && portalPlans.includes("monthly")) && (
                        <Field>
                            <FieldLabel>Default price at signup</FieldLabel>
                            <Select value={typeof portalDefaultPlan === "string" ? portalDefaultPlan : ""} onValueChange={(value) => updateSetting("portal_default_plan", value)}>
                                <SelectTrigger aria-label="Default price at signup"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    {defaultPlanOptions.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </Field>
                    )}
                </>
            )}

            <div className="flex flex-col gap-2">
                <span className="text-sm font-medium">Display notice at signup</span>
                <AnnouncementContentEditor
                    placeholder="By signing up, I agree to receive emails from ..."
                    value={portalSignupTermsHtml?.toString()}
                    onChange={(html) => updateSetting("portal_signup_terms_html", html)}
                />
                {errors.portal_signup_terms_html
                    ? <FieldError>{errors.portal_signup_terms_html}</FieldError>
                    : <FieldDescription>Recommended: <strong>115</strong> characters. You&apos;ve used <strong className="text-state-success">{signupTermsLength}</strong></FieldDescription>}
            </div>

            {portalSignupTermsHtml?.toString() && (
                <Field data-disabled={!isSignupAllowed || undefined} orientation="horizontal">
                    <FieldLabel htmlFor="portal-require-agreement">Require agreement</FieldLabel>
                    <Switch checked={Boolean(portalSignupCheckboxRequired)} disabled={!isSignupAllowed} id="portal-require-agreement" onCheckedChange={(checked) => updateSetting("portal_signup_checkbox_required", checked)} />
                </Field>
            )}
        </div>
    );
}
