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
import {OfficialTheme} from '../../providers/ServiceProvider';
import {Theme, useBrowseThemes, useInstallTheme, useUploadTheme} from '../../../api/themes';

interface ThemeToolbarProps {
    selectedTheme: OfficialTheme|null;
    currentTab: string;
    setCurrentTab: (tab: string) => void;
    setSelectedTheme: (theme: OfficialTheme|null) => void;
    modal: NiceModalHandler<Record<string, unknown>>;
    themes: Theme[];
    setPreviewMode: (mode: string) => void;
    previewMode: string;
}

interface ThemeModalContentProps {
    onSelectTheme: (theme: OfficialTheme|null) => void;
    currentTab: string;
    themes: Theme[];
}

const ThemeToolbar: React.FC<ThemeToolbarProps> = ({
    currentTab,
    setCurrentTab,
    modal,
    themes
}) => {
    const {updateRoute} = useRouting();
    const {mutateAsync: uploadTheme} = useUploadTheme();

    const onClose = () => {
        updateRoute('design/edit');
        modal.remove();
    };

    const handleThemeUpload = async ({
        file,
        onActivate
    }: {
        file: File;
        onActivate?: () => void
    }) => {
        const data = await uploadTheme({file});
        const uploadedTheme = data.themes[0];

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
                The theme <strong>&quot;{uploadedTheme.name}&quot;</strong> was installed successfully but we detected some {hasErrors ? 'errors' : 'warnings'}.
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
            onActivate: onActivate
        });
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
                                await handleThemeUpload({file, onActivate: onClose});
                                setCurrentTab('installed');
                                confirmModal?.remove();
                            }
                        });
                    } else {
                        setCurrentTab('installed');
                        handleThemeUpload({file, onActivate: onClose});
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
    themes
}) => {
    switch (currentTab) {
    case 'official':
        return (
            <OfficialThemes onSelectTheme={onSelectTheme} />
        );
    case 'installed':
        return (
            <AdvancedThemeSettings themes={themes} />
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
    const {data: {themes} = {}} = useBrowseThemes();
    const {mutateAsync: installTheme} = useInstallTheme();

    const onSelectTheme = (theme: OfficialTheme|null) => {
        setSelectedTheme(theme);
    };

    if (!themes) {
        return;
    }

    let installedTheme;
    let onInstall;
    if (selectedTheme) {
        installedTheme = themes.find(theme => theme.name.toLowerCase() === selectedTheme!.name.toLowerCase());
        onInstall = async () => {
            setInstalling(true);
            const data = await installTheme(selectedTheme.ref);
            setInstalling(false);

            const newlyInstalledTheme = data.themes[0];

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
                    The theme <strong>&quot;{newlyInstalledTheme.name}&quot;</strong> was installed successfully but we detected some {hasErrors ? 'errors' : 'warnings'}.
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
                        themes={themes}
                    />
                    <ThemeModalContent
                        currentTab={currentTab}
                        themes={themes}
                        onSelectTheme={onSelectTheme}
                    />
                </div>
            </div>
        </Modal>
    );
});

export default ChangeThemeModal;
