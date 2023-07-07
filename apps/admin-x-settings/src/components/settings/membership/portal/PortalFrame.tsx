import React, {useEffect, useRef, useState} from 'react';
import useSettingGroup from '../../../../hooks/useSettingGroup';
import {Setting, SiteData, Tier} from '../../../../types/api';
import {getSettingValue} from '../../../../utils/helpers';

type PortalFrameProps = {
    settings: Setting[];
    tiers: Tier[];
    selectedTab: string;
}

function getPortalPreviewUrl({settings, tiers, siteData, selectedTab}: {
    settings: Setting[],
    tiers: Tier[],
    siteData: SiteData|null,
    selectedTab: string
}) {
    if (!siteData?.url) {
        return null;
    }

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
    let page = 'signup';
    if (selectedTab === 'account') {
        page = 'accountHome';
    }

    settingsParam.append('button', `${portalButton}`);
    settingsParam.append('name', `${portalName}`);
    settingsParam.append('isFree', `${isFreeChecked}`);
    settingsParam.append('isMonthly', `${isMonthlyChecked}`);
    settingsParam.append('isYearly', `${isYearlyChecked}`);
    settingsParam.append('page', page);
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

    settingsParam.append('disableBackground', 'false');

    return `${baseUrl}${portalBase}?${settingsParam.toString()}`;
}

const PortalFrame: React.FC<PortalFrameProps> = ({settings, tiers, selectedTab}) => {
    const {
        siteData
    } = useSettingGroup();

    const iframeRef = useRef<HTMLIFrameElement>(null);
    const [portalReady, setPortalReady] = useState(false);

    let href = getPortalPreviewUrl({
        settings,
        tiers,
        siteData,
        selectedTab
    });

    useEffect(() => {
        const messageListener = (event: any) => {
            if (!href) {
                return;
            }
            const srcURL = new URL(href);
            const originURL = new URL(event.origin);

            if (originURL.origin === srcURL.origin) {
                if (event.data === 'portal-ready' || event.data.type === 'portal-ready') {
                    setPortalReady(true);
                }
            }
        };

        window.addEventListener('message', messageListener, true);
        return () => window.removeEventListener('message', messageListener, true);
    }, [href]);

    if (!href) {
        return null;
    }

    return (
        <>
            <iframe
                ref={iframeRef}
                className={!portalReady ? 'hidden' : ''}
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
