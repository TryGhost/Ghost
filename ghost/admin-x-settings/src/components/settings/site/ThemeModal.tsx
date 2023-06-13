import AdvancedThemeSettings from './theme/AdvancedThemeSettings';
import Button from '../../../admin-x-ds/global/Button';
import ButtonGroup from '../../../admin-x-ds/global/ButtonGroup';
import FileUpload from '../../../admin-x-ds/global/FileUpload';
import Modal from '../../../admin-x-ds/global/Modal';
import NewThemePreview from './theme/ThemePreview';
import NiceModal, {NiceModalHandler, useModal} from '@ebay/nice-modal-react';
import OfficialThemes from './theme/OfficialThemes';
import React, {useState} from 'react';
import TabView from '../../../admin-x-ds/global/TabView';
import {Theme} from '../../../types/api';
import {showToast} from '../../../admin-x-ds/global/Toast';
import {useApi} from '../../providers/ServiceProvider';
import {useThemes} from '../../../hooks/useThemes';

interface ThemeToolbarProps {
    selectedTheme: string;
    setCurrentTab: (tab: string) => void;
    setSelectedTheme: (theme: string) => void;
    modal: NiceModalHandler<Record<string, unknown>>;
    themes: Theme[];
    setThemes: (themes: Theme[]) => void;
}

interface ThemeModalContentProps {
    selectedTheme: string;
    onSelectTheme: (theme: string) => void;
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
    if (selectedTheme) {
        return (
            <div className='sticky top-0 flex justify-between gap-3 bg-white p-5 px-7'>
                <div className='flex w-[33%] items-center gap-2'>
                    <button
                        className={`text-sm`}
                        type="button"
                        onClick={() => {
                            setCurrentTab('official');
                            setSelectedTheme('');
                        }}>
                        Official themes
                    </button>
                    &rarr;
                    <span className='text-sm font-bold'>{selectedTheme}</span>
                </div>
                <div className='flex w-[33%] justify-end gap-8'>
                    <ButtonGroup
                        buttons={[
                            {icon: 'laptop', link: true, size: 'sm'},
                            {icon: 'mobile', iconColorClass: 'text-grey-500', link: true, size: 'sm'}
                        ]}
                    />
                    <Button color='green' label={`Install ${selectedTheme}`} />
                </div>
            </div>
        );
    } else {
        return (
            <div className='sticky top-0 flex justify-between gap-3 bg-white p-5 px-7'>
                <TabView
                    border={false}
                    tabs={[
                        {id: 'official', title: 'Official themes'},
                        {id: 'installed', title: 'Installed'}
                    ]}
                    onTabChange={(id: string) => {
                        setCurrentTab(id);
                    }}
                />

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
                </div>
            </div>
        );
    }
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
    const [selectedTheme, setSelectedTheme] = useState('');

    const modal = useModal();
    const {themes, setThemes} = useThemes();

    const onSelectTheme = (theme: string) => {
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