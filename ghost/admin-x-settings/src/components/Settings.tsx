import React from 'react';
import SettingSection from './settings/SettingSection';
import SettingGroup from './settings/SettingGroup';

const Settings: React.FC = () => {
    return (
    <>
        <SettingSection name="General">
            <SettingGroup name="Title and description" />
            <SettingGroup name="Timezone" />
            <SettingGroup name="Publication language" />
            <SettingGroup name="Meta data" />
            <SettingGroup name="Twitter card" />
            <SettingGroup name="Facebook card" />
            <SettingGroup name="Social accounts" />
            <SettingGroup name="Make this site private" />
            <SettingGroup name="Users and permissions" />
        </SettingSection>

        <SettingSection name="Site">
            <SettingGroup name="Branding and design" />
            <SettingGroup name="Navigation" />
        </SettingSection>

        <SettingSection name="Membership">
            <SettingGroup name="Portal" />
            <SettingGroup name="Access" />
            <SettingGroup name="Tiers" />
            <SettingGroup name="Analytics" />
        </SettingSection>

        <SettingSection name="Email newsletters">
            <SettingGroup name="Newsletter sending" />
            <SettingGroup name="Newsletters" />
            <SettingGroup name="Default recipients" />
        </SettingSection>

        <SettingSection name="Advanced">
            <SettingGroup name="Integrations" />
            <SettingGroup name="Code injection" />
            <SettingGroup name="Labs" />
            <SettingGroup name="History" />
        </SettingSection>
    </>
    );
}

export default Settings;