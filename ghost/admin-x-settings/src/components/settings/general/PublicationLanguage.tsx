import React from 'react';
import SettingGroup from '../../../admin-x-ds/settings/SettingGroup';
import SettingGroupContent from '../../../admin-x-ds/settings/SettingGroupContent';
import TextField from '../../../admin-x-ds/global/TextField';
import useSettingGroup from '../../../hooks/useSettingGroup';

const PublicationLanguage: React.FC = () => {
    const {
        currentState,
        saveState,
        handleSave,
        handleCancel,
        updateSetting,
        focusRef,
        getSettingValues,
        handleStateChange
    } = useSettingGroup();

    const [publicationLanguage] = getSettingValues(['locale']) as string[];

    const handleLanguageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        updateSetting('locale', e.target.value);
    };

    const values = (
        <SettingGroupContent values={[
            {
                heading: 'Site language',
                key: 'site-language',
                value: publicationLanguage
            }
        ]} />
    );

    const hint = (
        <>
            Default: English (<strong>en</strong>); find out more about
            <a className='text-green-400' href="https://ghost.org/docs/faq/translation/" rel="noopener noreferrer" target="_blank"> using Ghost in other languages</a>
        </>
    );

    const inputFields = (
        <SettingGroupContent columns={1}>
            <TextField
                hint={hint}
                inputRef={focusRef}
                placeholder="Site language"
                title='Site language'
                value={publicationLanguage}
                onChange={handleLanguageChange}
            />
        </SettingGroupContent>
    );

    return (
        <SettingGroup
            description="Set the language/locale which is used on your site"
            navid='publication-language'
            saveState={saveState}
            state={currentState}
            testId='publication-language'
            title="Publication Language"
            onCancel={handleCancel}
            onSave={handleSave}
            onStateChange={handleStateChange}
        >
            {currentState === 'view' ? values : inputFields }
        </SettingGroup>
    );
};

export default PublicationLanguage;
