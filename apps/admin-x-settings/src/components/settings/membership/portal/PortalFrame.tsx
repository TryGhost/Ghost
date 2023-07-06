import React, {useRef} from 'react';
import useSettingGroup from '../../../../hooks/useSettingGroup';
import {Setting, SiteData, Tier} from '../../../../types/api';
import {getSettingValue} from '../../../../utils/helpers';

type PortalFrameProps = {
    settings: Setting[];
    tiers: Tier[];
}

function getPortalPreviewUrl({settings, tiers, siteData}: {
    settings: Setting[],
    tiers: Tier[],
    siteData: SiteData
}) {
    let portalTiers = tiers.filter((t) => {
        return t.visibility === 'public' && t.type === 'paid';
    }).map(t => t.id);

    const baseUrl = siteData.url.replace(/\/$/, '');
    const portalBase = '/#/portal/preview';
    const settingsParam = new URLSearchParams();

    const signupButtonText = getSettingValue(settings, 'portal_button_signup_text') || '';
    let buttonIcon = getSettingValue(settings, 'portal_button_icon') as string;
    if (!buttonIcon) {
        buttonIcon = 'icon-1';
    }
    const portalPlans: string[] = JSON.parse(getSettingValue(settings, 'portal_plans') as string);
    const isFreeChecked = portalPlans.includes('free');
    const isMonthlyChecked = portalPlans.includes('monthly');
    const isYearlyChecked = portalPlans.includes('yearly');
    const portalButton = getSettingValue(settings, 'portal_button') || false;
    const portalName = getSettingValue(settings, 'portal_name');
    const portalButtonStyle = getSettingValue(settings, 'portal_button_style') as string;
    const signupCheckboxRequired = getSettingValue(settings, 'portal_signup_checkbox_required') as boolean;
    const portalSignupTermsHtml = getSettingValue(settings, 'portal_signup_terms_html') as string || '';

    settingsParam.append('button', `${portalButton}`);
    settingsParam.append('name', `${portalName}`);
    settingsParam.append('isFree', `${isFreeChecked}`);
    settingsParam.append('isMonthly', `${isMonthlyChecked}`);
    settingsParam.append('isYearly', `${isYearlyChecked}`);
    settingsParam.append('page', 'signup');
    settingsParam.append('buttonIcon', encodeURIComponent(buttonIcon));
    settingsParam.append('signupButtonText', encodeURIComponent(signupButtonText));
    settingsParam.append('membersSignupAccess', 'true');
    settingsParam.append('allowSelfSignup', 'true');
    settingsParam.append('signupTermsHtml', portalSignupTermsHtml);
    settingsParam.append('signupCheckboxRequired', `${signupCheckboxRequired}`);

    if (portalTiers) {
        const portalTiersList = portalTiers.join(',');
        settingsParam.append('portalProducts', encodeURIComponent(portalTiersList));
    }

    settingsParam.append('accentColor', encodeURIComponent(`${getSettingValue(settings, 'accent_color')}`));

    if (getSettingValue(settings, 'portal_button_style')) {
        settingsParam.append('buttonStyle', encodeURIComponent(portalButtonStyle));
    }

    settingsParam.append('disableBackground', 'true');

    return `${baseUrl}${portalBase}?${settingsParam.toString()}`;
}

const PortalFrame: React.FC<PortalFrameProps> = ({settings, tiers}) => {
    const {
        siteData
    } = useSettingGroup();

    const iframeRef = useRef<HTMLIFrameElement>(null);
    if (!siteData?.url) {
        return null;
    }
    let href = getPortalPreviewUrl({
        settings,
        tiers,
        siteData
    });

    return (
        <>
            <iframe
                ref={iframeRef}
                data-testid="portal-preview"
                height="100%"
                src={href}
                title="Portal Preview"
                width="100%"
            ></iframe>
        </>
    );
};

export default PortalFrame;
