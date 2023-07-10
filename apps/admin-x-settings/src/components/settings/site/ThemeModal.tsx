import AdvancedThemeSettings from './theme/AdvancedThemeSettings';
import Breadcrumbs from '../../../admin-x-ds/global/Breadcrumbs';
import Button from '../../../admin-x-ds/global/Button';
import ConfirmationModal from '../../../admin-x-ds/global/modal/ConfirmationModal';
import FileUpload from '../../../admin-x-ds/global/form/FileUpload';
import Modal from '../../../admin-x-ds/global/modal/Modal';
import NiceModal, {NiceModalHandler, useModal} from '@ebay/nice-modal-react';
import OfficialThemes from './theme/OfficialThemes';
import PageHeader from '../../../admin-x-ds/global/layout/PageHeader';
import React, {useState} from 'react';
import TabView from '../../../admin-x-ds/global/TabView';
import ThemeInstalledModal from './theme/ThemeInstalledModal';
import ThemePreview from './theme/ThemePreview';
import useRouting from '../../../hooks/useRouting';
import {API} from '../../../utils/api';
import {OfficialTheme} from '../../../models/themes';
import {Theme} from '../../../types/api';
import {useApi} from '../../providers/ServiceProvider';
import {useThemes} from '../../../hooks/useThemes';

interface ThemeToolbarProps {
    selectedTheme: OfficialTheme|null;
    currentTab: string;
    setCurrentTab: (tab: string) => void;
    setSelectedTheme: (theme: OfficialTheme|null) => void;
    modal: NiceModalHandler<Record<string, unknown>>;
    themes: Theme[];
    setThemes: React.Dispatch<React.SetStateAction<Theme[]>>;
    setPreviewMode: (mode: string) => void;
    previewMode: string;
}

interface ThemeModalContentProps {
    onSelectTheme: (theme: OfficialTheme|null) => void;
    currentTab: string;
    themes: Theme[];
    setThemes: React.Dispatch<React.SetStateAction<Theme[]>>;
}

function addThemeToList(theme: Theme, themes: Theme[]): Theme[] {
    const existingTheme = themes.find(t => t.name === theme.name);
    if (existingTheme) {
        return themes.map((t) => {
            if (t.name === theme.name) {
                return theme;
            }
            return t;
        });
    }
    return [...themes, theme];
}

async function handleThemeUpload({
    api,
    file,
    setThemes,
    onActivate
}: {
    api: API;
    file: File;
    setThemes: React.Dispatch<React.SetStateAction<Theme[]>>;
    onActivate?: () => void
}) {
    const data = await api.themes.upload({file});
    const uploadedTheme = data.themes[0];

    setThemes((_themes: Theme[]) => {
        return addThemeToList(uploadedTheme, _themes);
    });

    let title = 'Upload successful';
    let prompt = <>
        <strong>{uploadedTheme.name}</strong> uploaded successfully.
    </>;

    if (!uploadedTheme.active) {
        prompt = <>
            {prompt}{' '}
            Do you want to activate it now?
        </>;
    }

    if (uploadedTheme.errors?.length || uploadedTheme.warnings?.length) {
        const hasErrors = uploadedTheme.errors?.length;

        title = `Upload successful with ${hasErrors ? 'errors' : 'warnings'}`;
        prompt = <>
            The theme <strong>"{uploadedTheme.name}"</strong> was installed successfully but we detected some {hasErrors ? 'errors' : 'warnings'}.
        </>;

        if (!uploadedTheme.active) {
            prompt = <>
                {prompt}
                You are still able to activate and use the theme but it is recommended to fix these {hasErrors ? 'errors' : 'warnings'} before you do so.
            </>;
        }
    }

    NiceModal.show(ThemeInstalledModal, {
        title,
        prompt,
        installedTheme: uploadedTheme,
        setThemes,
        onActivate: onActivate
    });
}

const ThemeToolbar: React.FC<ThemeToolbarProps> = ({
    currentTab,
    setCurrentTab,
    modal,
    themes,
    setThemes
}) => {
    const {updateRoute} = useRouting();
    const api = useApi();

    const onClose = () => {
        updateRoute('design/edit');
        modal.remove();
    };

    const left =
        <Breadcrumbs
            items={[
                {label: 'Design', onClick: onClose},
                {label: 'Change theme'}
            ]}
            backIcon
            onBack={onClose}
        />;

    const right =
        <div className='flex items-center gap-14'>
            <TabView
                border={false}
                selectedTab={currentTab}
                tabs={[
                    {id: 'official', title: 'Official themes'},
                    {id: 'installed', title: 'Installed'}
                ]}
                onTabChange={(id: string) => {
                    setCurrentTab(id);
                }} />
            <div className='flex items-center gap-3'>
                <FileUpload id='theme-uplaod' onUpload={async (file: File) => {
                    const themeFileName = file?.name.replace(/\.zip$/, '');
                    const existingThemeNames = themes.map(t => t.name);
                    if (existingThemeNames.includes(themeFileName)) {
                        NiceModal.show(ConfirmationModal, {
                            title: 'Overwrite theme',
                            prompt: (
                                <>
                                    The theme <strong>{themeFileName}</strong> already exists.
                                    Do you want to overwrite it?
                                </>
                            ),
                            okLabel: 'Overwrite',
                            cancelLabel: 'Cancel',
                            okRunningLabel: 'Overwriting...',
                            okColor: 'red',
                            onOk: async (confirmModal) => {
                                await handleThemeUpload({api, file, setThemes, onActivate: onClose});
                                setCurrentTab('installed');
                                confirmModal?.remove();
                            }
                        });
                    } else {
                        setCurrentTab('installed');
                        handleThemeUpload({api, file, setThemes, onActivate: onClose});
                    }
                }}>
                    <Button color='black' label='Upload theme' tag='div' />
                </FileUpload>
                {/* <Button color='black' label='Save & Close' onClick={() => {
                    modal.remove();
                }} /> */}
            </div>
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
    const [isInstalling, setInstalling] = useState(false);
    const {updateRoute} = useRouting();

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
            setInstalling(true);
            const data = await api.themes.install(selectedTheme.ref);
            setInstalling(false);

            const newlyInstalledTheme = data.themes[0];
            setThemes([
                ...themes.map(theme => ({...theme, active: false})),
                newlyInstalledTheme
            ]);

            let title = 'Success';
            let prompt = <>
                <strong>{newlyInstalledTheme.name}</strong> has been successfully installed.
            </>;

            if (!newlyInstalledTheme.active) {
                prompt = <>
                    {prompt}{' '}
                    Do you want to activate it now?
                </>;
            }

            if (newlyInstalledTheme.errors?.length || newlyInstalledTheme.warnings?.length) {
                const hasErrors = newlyInstalledTheme.errors?.length;

                title = `Installed with ${hasErrors ? 'errors' : 'warnings'}`;
                prompt = <>
                    The theme <strong>"{newlyInstalledTheme.name}"</strong> was installed successfully but we detected some {hasErrors ? 'errors' : 'warnings'}.
                </>;

                if (!newlyInstalledTheme.active) {
                    prompt = <>
                        {prompt}
                        You are still able to activate and use the theme but it is recommended to contact the theme developer fix these {hasErrors ? 'errors' : 'warnings'} before you do so.
                    </>;
                }
            }

            NiceModal.show(ThemeInstalledModal, {
                title,
                prompt,
                installedTheme: newlyInstalledTheme,
                setThemes,
                onActivate: () => {
                    updateRoute('design/edit');
                    modal.remove();
                }
            });
        };
    }

    return (
        <Modal
            afterClose={() => {
                updateRoute('design/edit');
            }}
            cancelLabel=''
            footer={false}
            noPadding={true}
            size='full'
            testId='theme-modal'
            title=''
            scrolling
        >
            <div className='flex h-full justify-between'>
                <div className='grow'>
                    {selectedTheme &&
                        <ThemePreview
                            installButtonLabel={installedTheme ? `Update ${selectedTheme?.name}` : `Install ${selectedTheme?.name}`}
                            installedTheme={installedTheme}
                            isInstalling={isInstalling}
                            selectedTheme={selectedTheme}
                            onBack={() => {
                                setSelectedTheme(null);
                            }}
                            onClose={() => {
                                updateRoute('design/edit');
                                modal.remove();
                            }}
                            onInstall={onInstall} />
                    }
                    <ThemeToolbar
                        currentTab={currentTab}
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
