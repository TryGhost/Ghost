import React from 'react';
import {Heading, Separator, TextField, Toggle} from '@tryghost/admin-x-design-system';
import {type Setting, type SettingValue, getSettingValues} from '@tryghost/admin-x-framework/api/settings';

const TransistorSettings: React.FC<{
    localSettings: Setting[]
    updateSetting: (key: string, setting: SettingValue) => void
}> = ({localSettings, updateSetting}) => {
    const [
        transistorIntegrationEnabled,
        transistorPortalEnabled,
        transistorPortalHeading,
        transistorPortalDescription,
        transistorPortalButtonText,
        transistorPortalUrlTemplate
    ] = getSettingValues<string | boolean>(localSettings, [
        'transistor',
        'transistor_portal_enabled',
        'transistor_portal_heading',
        'transistor_portal_description',
        'transistor_portal_button_text',
        'transistor_portal_url_template'
    ]);

    // Don't show the section if the main Transistor integration is disabled
    const integrationEnabled = transistorIntegrationEnabled === true;
    if (!integrationEnabled) {
        return null;
    }

    const enabled = transistorPortalEnabled === true;
    const heading = transistorPortalHeading as string;
    const description = transistorPortalDescription as string;
    const buttonText = transistorPortalButtonText as string;
    const urlTemplate = transistorPortalUrlTemplate as string;

    return (
        <>
            <Separator />
            <Heading level={5}>Transistor</Heading>
            <Toggle
                checked={enabled}
                direction='rtl'
                hint='Show a section on the account page for members to access private podcasts'
                label='Enable Transistor integration'
                onChange={e => updateSetting('transistor_portal_enabled', e.target.checked)}
            />
            {enabled && (
                <>
                    <TextField
                        hint='The heading displayed above the Transistor section'
                        placeholder='Podcasts'
                        title='Heading'
                        value={heading}
                        onChange={e => updateSetting('transistor_portal_heading', e.target.value)}
                    />
                    <TextField
                        hint='A short description of what members can do'
                        placeholder='Access your RSS feeds'
                        title='Description'
                        value={description}
                        onChange={e => updateSetting('transistor_portal_description', e.target.value)}
                    />
                    <TextField
                        hint='The text displayed on the button'
                        placeholder='Manage'
                        title='Button text'
                        value={buttonText}
                        onChange={e => updateSetting('transistor_portal_button_text', e.target.value)}
                    />
                    <TextField
                        hint='Use {memberUuid} as a placeholder for the member ID'
                        placeholder='https://partner.transistor.fm/ghost/{memberUuid}'
                        title='URL template'
                        value={urlTemplate}
                        onChange={e => updateSetting('transistor_portal_url_template', e.target.value)}
                    />
                </>
            )}
        </>
    );
};

export default TransistorSettings;
