import React from 'react';
import {Box, Text} from '@tryghost/shade/primitives';
import {Field, FieldContent, FieldDescription, FieldLabel, Input, Separator, Switch} from '@tryghost/shade/components';
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
        <Box className='[&_:where(input)]:h-[var(--control-height)] [&_:where(input)]:border-transparent [&_:where(input)]:bg-muted'>
            <Separator />
            <Text as='h5' className='md:text-lg' leading='supertight' weight='bold'>Transistor</Text>
            <Field orientation='horizontal'>
                <FieldContent>
                    <FieldLabel htmlFor='transistor-portal-enabled'>Enable Transistor integration</FieldLabel>
                    <FieldDescription>Show a section on the account page for members to access private podcasts</FieldDescription>
                </FieldContent>
                <Switch checked={enabled} id='transistor-portal-enabled' onCheckedChange={checked => updateSetting('transistor_portal_enabled', checked)} />
            </Field>
            {enabled && (
                <>
                    <Field><FieldLabel htmlFor='transistor-heading'>Heading</FieldLabel><Input id='transistor-heading' placeholder='Podcasts' value={heading} onChange={e => updateSetting('transistor_portal_heading', e.target.value)} /><FieldDescription>The heading displayed above the Transistor section</FieldDescription></Field>
                    <Field><FieldLabel htmlFor='transistor-description'>Description</FieldLabel><Input id='transistor-description' placeholder='Access your RSS feeds' value={description} onChange={e => updateSetting('transistor_portal_description', e.target.value)} /><FieldDescription>A short description of what members can do</FieldDescription></Field>
                    <Field><FieldLabel htmlFor='transistor-button-text'>Button text</FieldLabel><Input id='transistor-button-text' placeholder='Manage' value={buttonText} onChange={e => updateSetting('transistor_portal_button_text', e.target.value)} /><FieldDescription>The text displayed on the button</FieldDescription></Field>
                    <Field><FieldLabel htmlFor='transistor-url-template'>URL template</FieldLabel><Input id='transistor-url-template' placeholder='https://partner.transistor.fm/ghost/{memberUuid}' value={urlTemplate} onChange={e => updateSetting('transistor_portal_url_template', e.target.value)} /><FieldDescription>Use {'{memberUuid}'} as a placeholder for the member ID</FieldDescription></Field>
                </>
            )}
        </Box>
    );
};

export default TransistorSettings;
