import React from 'react';
import {Heading, Separator, TextField, Toggle} from '@tryghost/admin-x-design-system';
import {type Setting, type SettingValue, getSettingValues} from '@tryghost/admin-x-framework/api/settings';

const TransistorSettings: React.FC<{
    localSettings: Setting[]
    updateSetting: (key: string, setting: SettingValue) => void
}> = ({localSettings, updateSetting}) => {
    const [
        transistorPortalEnabled,
        transistorPortalHeading,
        transistorPortalDescription,
        transistorPortalButtonText,
        transistorPortalUrlTemplate
    ] = getSettingValues<string | boolean>(localSettings, [
        'transistor_portal_enabled',
        'transistor_portal_heading',
        'transistor_portal_description',
        'transistor_portal_button_text',
        'transistor_portal_url_template'
    ]);

    const enabled = transistorPortalEnabled === true || transistorPortalEnabled === 'true';
    const heading = (transistorPortalHeading as string) || 'Podcasts';
    const description = (transistorPortalDescription as string) || 'Access your private podcast feed';
    const buttonText = (transistorPortalButtonText as string) || 'View';
    const urlTemplate = (transistorPortalUrlTemplate as string) || 'https://partner.transistor.fm/ghost/{memberUuid}';

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
                        title='Heading'
                        value={heading}
                        onChange={e => updateSetting('transistor_portal_heading', e.target.value)}
                    />
                    <TextField
                        hint='A short description of what members can do'
                        title='Description'
                        value={description}
                        onChange={e => updateSetting('transistor_portal_description', e.target.value)}
                    />
                    <TextField
                        hint='The text displayed on the button'
                        title='Button text'
                        value={buttonText}
                        onChange={e => updateSetting('transistor_portal_button_text', e.target.value)}
                    />
                    <TextField
                        hint='Use {memberUuid} as a placeholder for the member ID'
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
