import AdvancedThemeSettings from './theme/AdvancedThemeSettings';
import Button from '../../../admin-x-ds/global/Button';
import FileUpload from '../../../admin-x-ds/global/form/FileUpload';
import Modal from '../../../admin-x-ds/global/modal/Modal';
import NiceModal, {NiceModalHandler, useModal} from '@ebay/nice-modal-react';
import OfficialThemes from './theme/OfficialThemes';
import PageHeader from '../../../admin-x-ds/global/layout/PageHeader';
import React, {useState} from 'react';
import TabView from '../../../admin-x-ds/global/TabView';
import ThemePreview from './theme/ThemePreview';
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
    setPreviewMode: (mode: string) => void;
    previewMode: string;
}

interface ThemeModalContentProps {
    onSelectTheme: (theme: OfficialTheme|null) => void;
    currentTab: string;
    themes: Theme[];
    setThemes: (themes: Theme[]) => void;
}

const ThemeToolbar: React.FC<ThemeToolbarProps> = ({
    setCurrentTab,
    modal,
    themes,
    setThemes
}) => {
    const api = useApi();
    const left =
        <TabView
            border={false}
            tabs={[
                {id: 'official', title: 'Official themes'},
                {id: 'installed', title: 'Installed'}
            ]}
            onTabChange={(id: string) => {
                setCurrentTab(id);
            }} />;

    const right =
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

    return <PageHeader containerClassName='bg-white' left={left} right={right} />;
};

const ThemeModalContent: React.FC<ThemeModalContentProps> = ({
    currentTab,
    onSelectTheme,
    themes,
    setThemes
}) => {
    switch (currentTab) {
    case 'official':
        return (
            <OfficialThemes onSelectTheme={onSelectTheme} />
        );
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
    const [previewMode, setPreviewMode] = useState('desktop');

    const modal = useModal();
    const {themes, setThemes} = useThemes();
    const api = useApi();

    const onSelectTheme = (theme: OfficialTheme|null) => {
        setSelectedTheme(theme);
    };

    let installedTheme;
    let onInstall;
    if (selectedTheme) {
        installedTheme = themes.find(theme => theme.name.toLowerCase() === selectedTheme!.name.toLowerCase());
        onInstall = async () => {
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
        };
    }

    return (
        <Modal
            cancelLabel=''
            footer={false}
            noPadding={true}
            scrolling={currentTab === 'official' ? false : true}
            size='full'
            title=''
        >
            <div className='flex h-full justify-between'>
                <div className='grow'>
                    {selectedTheme &&
                        <ThemePreview
                            installButtonLabel={
                                installedTheme?.active ? 'Activated' : (installedTheme ? 'Installed' : `Install ${selectedTheme?.name}`)
                            }
                            selectedTheme={selectedTheme}
                            themeInstalled={Boolean(installedTheme)}
                            onBack={() => {
                                setSelectedTheme(null);
                            }}
                            onInstall={onInstall} />
                    }
                    <ThemeToolbar
                        modal={modal}
                        previewMode={previewMode}
                        selectedTheme={selectedTheme}
                        setCurrentTab={setCurrentTab}
                        setPreviewMode={setPreviewMode}
                        setSelectedTheme={setSelectedTheme}
                        setThemes={setThemes}
                        themes={themes}
                    />
                    <ThemeModalContent
                        currentTab={currentTab}
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
