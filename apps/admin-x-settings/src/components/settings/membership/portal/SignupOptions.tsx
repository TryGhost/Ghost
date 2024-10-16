import React, {useCallback, useEffect, useMemo} from 'react';
import {CheckboxGroup, CheckboxProps, Form, HtmlField, Select, SelectOption, Toggle} from '@tryghost/admin-x-design-system';
import {Setting, SettingValue, checkStripeEnabled, getSettingValues} from '@tryghost/admin-x-framework/api/settings';
import {Tier, getPaidActiveTiers} from '@tryghost/admin-x-framework/api/tiers';
import {useGlobalData} from '../../../providers/GlobalDataProvider';

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
        // eslint-disable-next-line react-hooks/exhaustive-deps
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

    // This is a bit unclear in current admin, maybe we should add a message if the settings are disabled?
    const isDisabled = membersSignupAccess !== 'all';

    const isStripeEnabled = checkStripeEnabled(localSettings, config!);

    let tiersCheckboxes: CheckboxProps[] = [];

    if (localTiers) {
        localTiers.forEach((tier) => {
            if (tier.type === 'free') {
                tiersCheckboxes.push({
                    checked: (portalPlans.includes('free')),
                    disabled: isDisabled,
                    label: tier.name,
                    value: 'free',
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

    const defaultPlanOptions: SelectOption[] = [
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

    return <div className='mt-7'><Form>
        <Toggle
            checked={Boolean(portalName)}
            disabled={isDisabled}
            label='Display name in signup form'
            labelStyle='heading'
            onChange={e => updateSetting('portal_name', e.target.checked)}
        />

        <CheckboxGroup
            checkboxes={tiersCheckboxes}
            title='Tiers available at signup'
        />

        {arePaidTiersVisible && (
            <>
                <CheckboxGroup
                    checkboxes={[
                        {
                            checked: portalPlans.includes('monthly'),
                            disabled: isDisabled,
                            label: 'Monthly',
                            value: 'monthly',
                            onChange: () => {
                                togglePlan('monthly');
                            }
                        },
                        {
                            checked: portalPlans.includes('yearly'),
                            disabled: isDisabled,
                            label: 'Yearly',
                            value: 'yearly',
                            onChange: () => {
                                togglePlan('yearly');
                            }
                        }
                    ]}
                    title='Prices available at signup'
                />
                {(portalPlans.includes('yearly') && portalPlans.includes('monthly')) &&
                    <Select
                        options={defaultPlanOptions}
                        selectedOption={defaultPlanOptions.find(option => option.value === portalDefaultPlan)}
                        title='Default price at signup'
                        onSelect={(option) => {
                            updateSetting('portal_default_plan', option?.value ?? 'yearly');
                        }}
                    />
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

        {portalSignupTermsHtml?.toString() && <Toggle
            checked={Boolean(portalSignupCheckboxRequired)}
            disabled={isDisabled}
            label='Require agreement'
            labelStyle='heading'
            onChange={e => updateSetting('portal_signup_checkbox_required', e.target.checked)}
        />}
    </Form></div>;
};

export default SignupOptions;
