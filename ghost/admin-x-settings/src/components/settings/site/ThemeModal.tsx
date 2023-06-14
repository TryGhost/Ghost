import AdvancedThemeSettings from './theme/AdvancedThemeSettings';
import Breadcrumbs from '../../../admin-x-ds/global/Breadcrumbs';
import Button from '../../../admin-x-ds/global/Button';
import ButtonGroup from '../../../admin-x-ds/global/ButtonGroup';
import FileUpload from '../../../admin-x-ds/global/form/FileUpload';
import Modal from '../../../admin-x-ds/global/modal/Modal';
import NewThemePreview from './theme/ThemePreview';
import NiceModal, {NiceModalHandler, useModal} from '@ebay/nice-modal-react';
import OfficialThemes from './theme/OfficialThemes';
import PageHeader from '../../../admin-x-ds/global/layout/PageHeader';
import React, {useState} from 'react';
import TabView from '../../../admin-x-ds/global/TabView';
import {OfficialTheme} from '../../../models/themes';
import {Theme} from '../../../types/api';
import {showToast} from '../../../admin-x-ds/global/Toast';
import {useApi} from '../../providers/ServiceProvider';
import {useThemes} from '../../../hooks/useThemes';

interface ThemeToolbarProps {
    selectedTheme: OfficialTheme|null;
    setCurrentTab: (tab: string) => void;
    setSelectedTheme: (theme: OfficialTheme|null) => void;
    modal: NiceModalHandler<Record<string, unknown>>;
    themes: Theme[];
    setThemes: (themes: Theme[]) => void;
}

interface ThemeModalContentProps {
    selectedTheme: OfficialTheme|null;
    onSelectTheme: (theme: OfficialTheme|null) => void;
    currentTab: string;
    themes: Theme[];
    setThemes: (themes: Theme[]) => void;
}

const ThemeToolbar: React.FC<ThemeToolbarProps> = ({
    selectedTheme,
    setCurrentTab,
    setSelectedTheme,
    modal,
    themes,
    setThemes
}) => {
    const api = useApi();

    let left, right;

    if (selectedTheme) {
        const installedTheme = themes.find(theme => theme.name.toLowerCase() === selectedTheme.name.toLowerCase());

        left =
            <div className='flex items-center gap-2'>
                <Breadcrumbs
                    items={[
                        {label: 'Official themes', onClick: () => {
                            setCurrentTab('official');
                            setSelectedTheme(null);
                        }},
                        {label: selectedTheme.name}
                    ]}
                />
            </div>;

        right =
            <div className='flex justify-end gap-8'>
                <ButtonGroup
                    buttons={[
                        {icon: 'laptop', link: true, size: 'sm'},
                        {icon: 'mobile', iconColorClass: 'text-grey-500', link: true, size: 'sm'}
                    ]}
                />
                <Button
                    color='green'
                    disabled={Boolean(installedTheme)}
                    label={installedTheme?.active ? 'Activated' : (installedTheme ? 'Installed' : `Install ${selectedTheme?.name}`)}
                    onClick={async () => {
                        const data = await api.themes.install(selectedTheme.ref);
                        const newlyInstalledTheme = data.themes[0];
                        setThemes([
                            ...themes.map(theme => ({...theme, active: false})),
                            newlyInstalledTheme
                        ]);
                        showToast({
                            message: `Theme installed - ${newlyInstalledTheme.name}`
                        });
                        setCurrentTab('installed');
                    }}
                />
            </div>;
    } else {
        left =
            <TabView
                border={false}
                tabs={[
                    {id: 'official', title: 'Official themes'},
                    {id: 'installed', title: 'Installed'}
                ]}
                onTabChange={(id: string) => {
                    setCurrentTab(id);
                }} />;

        right =
            <div className='flex items-center gap-3'>
                <FileUpload id='theme-uplaod' onUpload={async (file: File) => {
                    const data = await api.themes.upload({file});
                    const uploadedTheme = data.themes[0];
                    setThemes([...themes, uploadedTheme]);
                    showToast({
                        message: `Theme uploaded - ${uploadedTheme.name}`
                    });
                }}>Upload theme</FileUpload>
                <Button
                    className='min-w-[75px]'
                    color='black'
                    label='OK'
                    onClick = {() => {
                        modal.remove();
                    }} />
            </div>;
    }

    return <PageHeader containerClassName={selectedTheme! && 'bg-grey-50'} left={left} right={right} />;
};

const ThemeModalContent: React.FC<ThemeModalContentProps> = ({
    currentTab,
    selectedTheme,
    onSelectTheme,
    themes,
    setThemes
}) => {
    switch (currentTab) {
    case 'official':
        if (selectedTheme) {
            return (
                <NewThemePreview selectedTheme={selectedTheme} />
            );
        } else {
            return (
                <OfficialThemes onSelectTheme={onSelectTheme} />
            );
        }
    case 'installed':
        return (
            <AdvancedThemeSettings
                setThemes={setThemes}
                themes={themes}
            />
        );
    }
    return null;
};

const ChangeThemeModal = NiceModal.create(() => {
    const [currentTab, setCurrentTab] = useState('official');
    const [selectedTheme, setSelectedTheme] = useState<OfficialTheme|null>(null);

    const modal = useModal();
    const {themes, setThemes} = useThemes();

    const onSelectTheme = (theme: OfficialTheme|null) => {
        setSelectedTheme(theme);
    };

    return (
        <Modal
            cancelLabel=''
            footer={false}
            noPadding={true}
            size='full'
            title=''
        >
            <div className='flex h-full justify-between'>
                <div className='grow'>
                    <ThemeToolbar
                        modal={modal}
                        selectedTheme={selectedTheme}
                        setCurrentTab={setCurrentTab}
                        setSelectedTheme={setSelectedTheme}
                        setThemes={setThemes}
                        themes={themes}
                    />
                    <ThemeModalContent
                        currentTab={currentTab}
                        selectedTheme={selectedTheme}
                        setThemes={setThemes}
                        themes={themes}
                        onSelectTheme={onSelectTheme}
                    />
                </div>
            </div>
        </Modal>
    );
});

export default ChangeThemeModal;
