import HtmlField from '../../../html-field';
import React, {useCallback, useEffect, useMemo} from 'react';
import {Checkbox, Field, FieldGroup, FieldLabel, FieldLegend, FieldSet, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Switch} from '@tryghost/shade/components';
import {type Setting, type SettingValue, checkStripeEnabled, getSettingValues} from '@tryghost/admin-x-framework/api/settings';
import {type Tier, getPaidActiveTiers} from '@tryghost/admin-x-framework/api/tiers';
import {useGlobalData} from '../../../providers/global-data-provider';

type SignupCheckbox = {
    checked: boolean;
    disabled?: boolean;
    label: string;
    onChange: (checked: boolean) => void;
    testId?: string;
    value: string;
};

const SignupOptions: React.FC<{
    localSettings: Setting[]
    updateSetting: (key: string, setting: SettingValue) => void
    localTiers: Tier[]
    updateTier: (tier: Tier) => void
    errors: Record<string, string | undefined>
    setError: (key: string, error: string | undefined) => void
}> = ({localSettings, updateSetting, localTiers, updateTier, errors, setError}) => {
    const {config} = useGlobalData();
    const [membersSignupAccess, portalName, portalSignupTermsHtml, portalSignupCheckboxRequired, portalPlansJson, portalDefaultPlan] = getSettingValues(
        localSettings, ['members_signup_access', 'portal_name', 'portal_signup_terms_html', 'portal_signup_checkbox_required', 'portal_plans', 'portal_default_plan']
    );
    const portalPlans = JSON.parse(portalPlansJson?.toString() || '[]') as string[];

    const signupTermsMaxLength = 115;
    const signupTermsLength = useMemo(() => {
        const div = document.createElement('div');
        div.innerHTML = portalSignupTermsHtml?.toString() || '';
        return div.innerText.length;
    }, [portalSignupTermsHtml]);

    const handleError = useCallback((key: string, error: string | undefined) => {
        setError(key, error);
    }, []);

    useEffect(() => {
        if (signupTermsLength > signupTermsMaxLength) {
            handleError('portal_signup_terms_html', 'Signup notice is too long');
        } else {
            handleError('portal_signup_terms_html', undefined);
        }
    }, [signupTermsLength, handleError]);

    const togglePlan = (plan: string) => {
        const index = portalPlans.indexOf(plan);

        if (index === -1) {
            portalPlans.push(plan);
        } else {
            portalPlans.splice(index, 1);
        }

        updateSetting('portal_plans', JSON.stringify(portalPlans));

        // Check default plan is included
        if (portalDefaultPlan === 'yearly') {
            if (!portalPlans.includes('yearly') && portalPlans.includes('monthly')) {
                updateSetting('portal_default_plan', 'monthly');
            }
        } else if (portalDefaultPlan === 'monthly') {
            if (!portalPlans.includes('monthly')) {
                // If both yearly and monthly are missing from plans, still set it to yearly
                updateSetting('portal_default_plan', 'yearly');
            }
        }
    };

    const isSignupAllowed = membersSignupAccess === 'all' || membersSignupAccess === 'paid';
    const isFreeSignupAllowed = membersSignupAccess === 'all';
    const isStripeEnabled = checkStripeEnabled(localSettings, config!);

    const tiersCheckboxes: SignupCheckbox[] = [];

    if (localTiers) {
        localTiers.forEach((tier) => {
            if (tier.type === 'free' && isFreeSignupAllowed) {
                tiersCheckboxes.push({
                    checked: (portalPlans.includes('free')),
                    disabled: !isSignupAllowed,
                    label: tier.name,
                    value: 'free',
                    testId: 'free-tier-checkbox',
                    onChange: (checked) => {
                        if (portalPlans.includes('free') && !checked) {
                            portalPlans.splice(portalPlans.indexOf('free'), 1);
                        }

                        if (!portalPlans.includes('free') && checked) {
                            portalPlans.push('free');
                        }

                        updateSetting('portal_plans', JSON.stringify(portalPlans));

                        updateTier({...tier, visibility: checked ? 'public' : 'none'});
                    }
                });
            }
        });
    }

    const paidActiveTiers = getPaidActiveTiers(localTiers) || [];

    const defaultPlanOptions = [
        {value: 'yearly', label: 'Yearly'},
        {value: 'monthly', label: 'Monthly'}
    ];

    if (isStripeEnabled && paidActiveTiers.length > 0) {
        paidActiveTiers.forEach((tier) => {
            tiersCheckboxes.push({
                checked: (tier.visibility === 'public'),
                label: tier.name,
                value: tier.id,
                onChange: (checked => updateTier({...tier, visibility: checked ? 'public' : 'none'}))
            });
        });
    }

    const arePaidTiersVisible = isStripeEnabled && paidActiveTiers.length > 0 && paidActiveTiers.some(tier => tier.visibility === 'public');

    return <div className='mt-7'><FieldGroup className='mb-10 gap-8'>
        <Field data-disabled={!isSignupAllowed || undefined} orientation='horizontal'>
            <FieldLabel htmlFor='portal-display-name'>Display name in signup form</FieldLabel>
            <Switch checked={Boolean(portalName)} disabled={!isSignupAllowed} id='portal-display-name' onCheckedChange={checked => updateSetting('portal_name', checked)} />
        </Field>

        <FieldSet>
            <FieldLegend variant='label'>Available tiers</FieldLegend>
            <FieldGroup data-slot='checkbox-group'>
                {tiersCheckboxes.map(checkbox => (
                    <Field key={checkbox.value} data-disabled={checkbox.disabled || undefined} orientation='horizontal'>
                        <Checkbox
                            checked={checkbox.checked}
                            data-testid={checkbox.testId}
                            disabled={checkbox.disabled}
                            id={`portal-tier-${checkbox.value}`}
                            onCheckedChange={checked => checkbox.onChange(checked === true)}
                        />
                        <FieldLabel htmlFor={`portal-tier-${checkbox.value}`}>{checkbox.label}</FieldLabel>
                    </Field>
                ))}
            </FieldGroup>
        </FieldSet>

        {arePaidTiersVisible && (
            <>
                <FieldSet>
                    <FieldLegend variant='label'>Available prices</FieldLegend>
                    <FieldGroup data-slot='checkbox-group'>
                        {['monthly', 'yearly'].map(plan => (
                            <Field key={plan} data-disabled={!isSignupAllowed || undefined} orientation='horizontal'>
                                <Checkbox
                                    checked={portalPlans.includes(plan)}
                                    disabled={!isSignupAllowed}
                                    id={`portal-plan-${plan}`}
                                    onCheckedChange={() => togglePlan(plan)}
                                />
                                <FieldLabel className='capitalize' htmlFor={`portal-plan-${plan}`}>{plan}</FieldLabel>
                            </Field>
                        ))}
                    </FieldGroup>
                </FieldSet>
                {(portalPlans.includes('yearly') && portalPlans.includes('monthly')) &&
                    <Field>
                        <FieldLabel>Default price at signup</FieldLabel>
                        <Select value={typeof portalDefaultPlan === 'string' ? portalDefaultPlan : ''} onValueChange={value => updateSetting('portal_default_plan', value)}>
                            <SelectTrigger aria-label='Default price at signup'><SelectValue /></SelectTrigger>
                            <SelectContent>
                                {defaultPlanOptions.map(option => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </Field>
                }
            </>
        )}

        <HtmlField
            error={Boolean(errors.portal_signup_terms_html)}
            hint={errors.portal_signup_terms_html || <>Recommended: <strong>115</strong> characters. You&apos;ve used <strong className="text-green">{signupTermsLength}</strong></>}
            nodes='MINIMAL_NODES'
            placeholder={`By signing up, I agree to receive emails from ...`}
            title='Display notice at signup'
            value={portalSignupTermsHtml?.toString()}
            onChange={html => updateSetting('portal_signup_terms_html', html)}
        />

        {portalSignupTermsHtml?.toString() && <Field data-disabled={!isSignupAllowed || undefined} orientation='horizontal'>
            <FieldLabel htmlFor='portal-require-agreement'>Require agreement</FieldLabel>
            <Switch checked={Boolean(portalSignupCheckboxRequired)} disabled={!isSignupAllowed} id='portal-require-agreement' onCheckedChange={checked => updateSetting('portal_signup_checkbox_required', checked)} />
        </Field>}
    </FieldGroup></div>;
};

export default SignupOptions;
