import React, {useEffect, useRef, useState} from 'react';
import {Config} from '../../../../api/config';
import {Setting, checkStripeEnabled, getSettingValue} from '../../../../api/settings';
import {SiteData} from '../../../../api/site';
import {Tier} from '../../../../api/tiers';
import {useGlobalData} from '../../../providers/GlobalDataProvider';

type PortalFrameProps = {
    settings: Setting[];
    tiers: Tier[];
    selectedTab: string;
}

function getPortalPreviewUrl({settings, config, tiers, siteData, selectedTab}: {
    settings: Setting[];
    config: Config;
    tiers: Tier[];
    siteData: SiteData | null;
    selectedTab: string;
}) {
    if (!siteData?.url) {
        return null;
    }
    let portalTiers = tiers.filter((t) => {
        return t.visibility === 'public' && t.type === 'paid';
    }).map(t => t.id);

    const baseUrl = siteData.url.replace(/\/$/, '');
    const portalBase = '/?v=modal-portal-settings#/portal/preview';

    const portalPlans: string[] = JSON.parse(getSettingValue<string>(settings, 'portal_plans') || '');
    const membersSignupAccess = getSettingValue<string>(settings, 'members_signup_access');
    const allowSelfSignup = membersSignupAccess === 'all' && (!checkStripeEnabled(settings, config) || portalPlans.includes('free'));

    const settingsParam = new URLSearchParams();
    settingsParam.append('button', getSettingValue(settings, 'portal_button') ? 'true' : 'false');
    settingsParam.append('name', getSettingValue(settings, 'portal_name') ? 'true' : 'false');
    settingsParam.append('isFree', portalPlans.includes('free') ? 'true' : 'false');
    settingsParam.append('isMonthly', checkStripeEnabled(settings, config) && portalPlans.includes('monthly') ? 'true' : 'false');
    settingsParam.append('isYearly', checkStripeEnabled(settings, config) && portalPlans.includes('yearly') ? 'true' : 'false');
    settingsParam.append('page', selectedTab === 'account' ? 'accountHome' : 'signup');
    settingsParam.append('buttonIcon', encodeURIComponent(getSettingValue(settings, 'portal_button_icon') || 'icon-1'));
    settingsParam.append('signupButtonText', encodeURIComponent(getSettingValue(settings, 'portal_button_signup_text') || ''));
    settingsParam.append('membersSignupAccess', getSettingValue(settings, 'members_signup_access') || 'all');
    settingsParam.append('allowSelfSignup', allowSelfSignup ? 'true' : 'false');
    settingsParam.append('signupTermsHtml', getSettingValue(settings, 'portal_signup_terms_html') || '');
    settingsParam.append('signupCheckboxRequired', getSettingValue(settings, 'portal_signup_checkbox_required') ? 'true' : 'false');
    settingsParam.append('portalProducts', encodeURIComponent(portalTiers.join(','))); // assuming that it might be more than 1

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
        siteData,
        config
    } = useGlobalData();

    const iframeRef = useRef<HTMLIFrameElement>(null);
    const [portalReady, setPortalReady] = useState(false);

    let href = getPortalPreviewUrl({
        settings,
        config,
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
