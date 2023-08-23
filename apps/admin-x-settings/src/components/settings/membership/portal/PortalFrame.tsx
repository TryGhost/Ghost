import React, {useEffect, useRef, useState} from 'react';
import useSettingGroup from '../../../../hooks/useSettingGroup';
import {Setting, getSettingValue} from '../../../../api/settings';
import {SiteData} from '../../../../api/site';
import {Tier} from '../../../../api/tiers';

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
    const portalBase = '/?v=modal-portal-settings#/portal/preview';
    const settingsParam = new URLSearchParams();
    const signupButtonText = getSettingValue(settings, 'portal_button_signup_text') || '';
    let buttonIcon = getSettingValue(settings, 'portal_button_icon') as string || 'icon-1';
    const portalPlans: string[] = JSON.parse(getSettingValue(settings, 'portal_plans') as string);
    const isFreeChecked = portalPlans.includes('free') ? 'true' : 'false';
    const isMonthlyChecked = portalPlans.includes('monthly') ? 'true' : 'false';
    const isYearlyChecked = portalPlans.includes('yearly') ? 'true' : 'false';
    const portalButton = getSettingValue(settings, 'portal_button') === true ? 'true' : 'false'; // Assuming a boolean
    const portalName = getSettingValue(settings, 'portal_name') as boolean;
    const signupCheckboxRequired = getSettingValue(settings, 'portal_signup_checkbox_required') ? 'true' : 'false'; // Assuming a boolean
    const portalSignupTermsHtml = getSettingValue(settings, 'portal_signup_terms_html') || '';
    let page = selectedTab === 'account' ? 'accountHome' : 'signup';

    settingsParam.append('button', portalButton);
    settingsParam.append('name', portalName ? 'true' : 'false');
    settingsParam.append('isFree', isFreeChecked);
    settingsParam.append('isMonthly', isMonthlyChecked);
    settingsParam.append('isYearly', isYearlyChecked);
    settingsParam.append('page', page);
    settingsParam.append('buttonIcon', encodeURIComponent(buttonIcon));
    settingsParam.append('signupButtonText', encodeURIComponent(signupButtonText));
    settingsParam.append('membersSignupAccess', 'all');
    settingsParam.append('allowSelfSignup', 'true');
    settingsParam.append('signupTermsHtml', portalSignupTermsHtml.toString());
    settingsParam.append('signupCheckboxRequired', signupCheckboxRequired);

    if (portalTiers && portalTiers.length) {
        settingsParam.append('portalProducts', encodeURIComponent(portalTiers.join(','))); // assuming that it might be more than 1
    }

    if (portalPlans && portalPlans.length) {
        settingsParam.append('portalPrices', encodeURIComponent(portalPlans.join(',')));
    }

    const accentColor = getSettingValue(settings, 'accent_color');
    if (accentColor !== undefined && accentColor !== null) {
        settingsParam.append('accentColor', encodeURIComponent(accentColor));
    }

    const portalButtonStyle = getSettingValue(settings, 'portal_button_style');
    if (portalButtonStyle) {
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
        const messageListener = (event: MessageEvent<'portal-ready' | {type: string}>) => {
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
