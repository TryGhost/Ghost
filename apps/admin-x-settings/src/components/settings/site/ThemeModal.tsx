import AdvancedThemeSettings from './theme/AdvancedThemeSettings';
import InvalidThemeModal, {FatalErrors} from './theme/InvalidThemeModal';
import NiceModal, {NiceModalHandler, useModal} from '@ebay/nice-modal-react';
import OfficialThemes from './theme/OfficialThemes';
import React, {useEffect, useState} from 'react';
import ThemeInstalledModal from './theme/ThemeInstalledModal';
import ThemePreview from './theme/ThemePreview';
import useQueryParams from '../../../hooks/useQueryParams';
import {Button, ConfirmationModal, FileUpload, LimitModal, Modal, PageHeader, TabView, showToast} from '@tryghost/admin-x-design-system';
import {HostLimitError, useLimiter} from '../../../hooks/useLimiter';
import {InstalledTheme, Theme, ThemesInstallResponseType, isDefaultOrLegacyTheme, useActivateTheme, useBrowseThemes, useInstallTheme, useUploadTheme} from '@tryghost/admin-x-framework/api/themes';
import {JSONError} from '@tryghost/admin-x-framework/errors';
import {OfficialTheme} from '../../providers/SettingsAppProvider';
import {useHandleError} from '@tryghost/admin-x-framework/hooks';
import {useRouting} from '@tryghost/admin-x-framework/routing';

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

const UploadModalContent: React.FC<{onUpload: (file: File) => void}> = ({onUpload}) => {
    const modal = useModal();

    return <div className="-mb-6">
        <FileUpload
            id="theme-upload"
            onUpload={(file) => {
                modal.remove();
                onUpload(file);
            }}
        >
            <div className="cursor-pointer bg-grey-75 p-10 text-center dark:bg-grey-950">
            Click to select or drag & drop zip file
            </div>
        </FileUpload>
    </div>;
};

const ThemeToolbar: React.FC<ThemeToolbarProps> = ({
    currentTab,
    setCurrentTab,
    themes
}) => {
    const modal = useModal();
    const {updateRoute} = useRouting();
    const {mutateAsync: uploadTheme} = useUploadTheme();
    const limiter = useLimiter();
    const handleError = useHandleError();

    const [uploadConfig, setUploadConfig] = useState<{enabled: boolean; error?: string}>();

    const [isUploading, setUploading] = useState(false);

    useEffect(() => {
        if (limiter) {
            // Sending a bad string to make sure it fails (empty string isn't valid)
            limiter.errorIfWouldGoOverLimit('customThemes', {value: '.'})
                .then(() => setUploadConfig({enabled: true}))
                .catch((error) => {
                    if (error instanceof HostLimitError) {
                        setUploadConfig({enabled: false, error: error.message});
                    }
                });
        } else {
            setUploadConfig({enabled: true});
        }
    }, [limiter]);

    const onClose = () => {
        updateRoute('/');
    };

    const onThemeUpload = async (file: File) => {
        const themeFileName = file?.name.replace(/\.zip$/, '');
        const existingThemeNames = themes.map(t => t.name);
        if (isDefaultOrLegacyTheme({name: themeFileName})) {
            NiceModal.show(ConfirmationModal, {
                title: 'Upload failed',
                cancelLabel: 'Cancel',
                okLabel: '',
                prompt: (
                    <>
                        <p>The default <strong>{themeFileName}</strong> theme cannot be overwritten.</p>
                        <p>Rename your zip file and try again.</p>
                    </>
                ),
                onOk: async (confirmModal) => {
                    confirmModal?.remove();
                }
            });
        } else if (existingThemeNames.includes(themeFileName)) {
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
                    setUploading(true);

                    // this is to avoid the themes array from returning the overwritten theme.
                    // find index of themeFileName in existingThemeNames and remove from the array
                    const index = existingThemeNames.indexOf(themeFileName);
                    themes.splice(index, 1);

                    await handleThemeUpload({file, onActivate: onClose});
                    setUploading(false);
                    setCurrentTab('installed');
                    confirmModal?.remove();
                }
            });
        } else {
            setCurrentTab('installed');
            handleThemeUpload({file, onActivate: onClose});
        }
    };

    const handleThemeUpload = async ({
        file,
        onActivate
    }: {
        file: File;
        onActivate?: () => void
    }) => {
        let data: ThemesInstallResponseType | undefined;
        let fatalErrors: FatalErrors | null = null;

        try {
            setUploading(true);
            data = await uploadTheme({file});
            setUploading(false);
        } catch (e) {
            setUploading(false);

            if (e instanceof JSONError && e.response?.status === 422 && e.data?.errors) {
                fatalErrors = (e.data.errors as any) as FatalErrors;
            } else {
                handleError(e);
            }
        }

        if (fatalErrors && !data) {
            let title = 'Invalid Theme';
            let prompt = <>This theme is invalid and cannot be activated. Fix the following errors and re-upload the theme</>;
            NiceModal.show(InvalidThemeModal, {
                title,
                prompt,
                fatalErrors,
                onRetry: async () => {
                    modal?.remove();
                    handleUpload();
                }
            });
        }

        if (!data) {
            return;
        }

        const uploadedTheme = data.themes[0];

        let title = 'Upload successful';
        let prompt = <>
            <strong>{uploadedTheme.name}</strong> uploaded
        </>;

        if (!uploadedTheme.active) {
            prompt = <>
                {prompt}{' '}
                Do you want to activate it now?
            </>;
        }

        if (uploadedTheme?.gscan_errors?.length || uploadedTheme.warnings?.length) {
            const hasErrors = uploadedTheme?.gscan_errors?.length;

            title = `Upload successful with ${hasErrors ? 'errors' : 'warnings'}`;
            prompt = <>
                The theme <strong>&quot;{uploadedTheme.name}&quot;</strong> was installed but we detected some {hasErrors ? 'errors' : 'warnings'}.
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
    <div className='hidden md:!visible md:!block'>
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
    </div>;

    const handleUpload = () => {
        if (uploadConfig?.enabled) {
            NiceModal.show(ConfirmationModal, {
                title: 'Upload theme',
                prompt: <UploadModalContent onUpload={onThemeUpload} />,
                okLabel: '',
                formSheet: false
            });
        } else {
            NiceModal.show(LimitModal, {
                title: 'Upgrade to enable custom themes',
                prompt: uploadConfig?.error || <>Your current plan only supports official themes. You can install them from the <a href="https://ghost.org/marketplace/">Ghost theme marketplace</a>.</>,
                onOk: () => updateRoute({route: '/pro', isExternal: true})
            });
        }
    };

    const right =
        <div className='flex items-center gap-14'>
            <div className='flex items-center gap-3'>
                <Button label='Close' onClick={() => {
                    modal.remove();
                    onClose();
                }} />
                <Button color='black' label='Upload theme' loading={isUploading} onClick={handleUpload} />
            </div>
        </div>;

    return (<>
        <PageHeader containerClassName='bg-white dark:bg-black' left={left} right={right} />
        <div className='px-[8vmin] md:hidden'>
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
        </div>
    </>);
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

type ChangeThemeModalProps = {
    source?: string | null;
    themeRef?: string | null;
};

const ChangeThemeModal: React.FC<ChangeThemeModalProps> = ({source, themeRef}) => {
    const [currentTab, setCurrentTab] = useState('official');
    const [selectedTheme, setSelectedTheme] = useState<OfficialTheme|null>(null);
    const [previewMode, setPreviewMode] = useState('desktop');
    const [isInstalling, setInstalling] = useState(false);
    const [installedFromMarketplace, setInstalledFromMarketplace] = useState(false);
    const {updateRoute} = useRouting();
    const refParam = useQueryParams().getParam('ref');

    const modal = useModal();
    const {data: {themes} = {}} = useBrowseThemes();
    const {mutateAsync: installTheme} = useInstallTheme();
    const {mutateAsync: activateTheme} = useActivateTheme();
    const handleError = useHandleError();

    const onSelectTheme = (theme: OfficialTheme|null) => {
        setSelectedTheme(theme);
    };

    // probably not the best place to handle the logic here, something for cleanup.
    useEffect(() => {
        // this grabs the theme ref from the url and installs it
        if (source && themeRef && !installedFromMarketplace) {
            const themeName = themeRef.split('/')[1];
            let titleText = 'Install Theme';
            const existingThemeNames = themes?.map(t => t.name) || [];
            let willOverwrite = existingThemeNames.includes(themeName.toLowerCase());
            const index = existingThemeNames.indexOf(themeName.toLowerCase());
            // get the theme that will be overwritten
            const themeToOverwrite = themes?.[index];
            let prompt = <>By clicking below, <strong>{themeName}</strong> will automatically be activated as the theme for your site.
                {willOverwrite &&
                <>
                    <br/>
                    <br/>
                    This will overwrite your existing version of <strong>Liebling</strong>{themeToOverwrite?.active ? ' which is your active theme' : ''}. All custom changes will be lost.
                </>
                }
            </>;
            NiceModal.show(ConfirmationModal, {
                title: titleText,
                prompt,
                okLabel: 'Install',
                cancelLabel: 'Cancel',
                okRunningLabel: 'Installing...',
                okColor: 'black',
                onOk: async (confirmModal) => {
                    let data: ThemesInstallResponseType | undefined;
                    setInstalledFromMarketplace(true);
                    try {
                        if (willOverwrite) {
                            if (themes) {
                                themes.splice(index, 1);
                            }
                        }
                        data = await installTheme(themeRef);
                        if (data?.themes[0]) {
                            await activateTheme(data.themes[0].name);
                            showToast({
                                title: 'Theme activated',
                                type: 'success',
                                message: <div><span className='capitalize'>{data.themes[0].name}</span> is now your active theme</div>
                            });
                        }
                        confirmModal?.remove();
                        updateRoute('');
                    } catch (e) {
                        handleError(e);
                    }
                    if (!data) {
                        return;
                    }
                }
            });
        }
    }, [themeRef, source, installTheme, handleError, activateTheme, updateRoute, themes, installedFromMarketplace, refParam]);

    if (!themes) {
        return;
    }

    let installedTheme: Theme|InstalledTheme|undefined;
    let onInstall;
    if (selectedTheme) {
        installedTheme = themes.find(theme => theme.name.toLowerCase() === selectedTheme!.name.toLowerCase());
        onInstall = async () => {
            let title = 'Success';
            let prompt = <></>;

            // default theme can't be installed, only activated
            if (isDefaultOrLegacyTheme(selectedTheme)) {
                title = 'Activate theme';
                prompt = <>By clicking below, <strong>{selectedTheme.name}</strong> will automatically be activated as the theme for your site.</>;
            } else {
                setInstalling(true);
                let data: ThemesInstallResponseType | undefined;
                try {
                    data = await installTheme(selectedTheme.ref);
                } catch (e) {
                    handleError(e);
                } finally {
                    setInstalling(false);
                }

                if (!data) {
                    return;
                }

                const newlyInstalledTheme = data.themes[0];

                title = 'Success';
                prompt = <>
                    <strong>{newlyInstalledTheme.name}</strong> has been successfully installed.
                </>;

                if (!newlyInstalledTheme.active) {
                    prompt = <>
                        {prompt}{' '}
        Do you want to activate it now?
                    </>;
                }

                if (newlyInstalledTheme.gscan_errors?.length || newlyInstalledTheme.warnings?.length) {
                    const hasErrors = newlyInstalledTheme.gscan_errors?.length;

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

                installedTheme = newlyInstalledTheme;
            }

            NiceModal.show(ThemeInstalledModal, {
                title,
                prompt,
                installedTheme: installedTheme!,
                onActivate: () => {
                    updateRoute('');
                }
            });
        };
    }

    return (
        <Modal
            afterClose={() => {
                updateRoute('');
            }}
            animate={false}
            cancelLabel=''
            footer={false}
            padding={false}
            size='full'
            testId='theme-modal'
            title=''
            scrolling
            onCancel={() => {
                modal.remove();
                updateRoute('');
            }}
        >
            <div className='flex h-full justify-between'>
                <div className='grow'>
                    {selectedTheme &&
                        <ThemePreview
                            installedTheme={installedTheme}
                            isInstalling={isInstalling}
                            selectedTheme={selectedTheme}
                            onBack={() => {
                                setSelectedTheme(null);
                            }}
                            onClose={() => {
                                updateRoute('');
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
                    {!selectedTheme &&
                        <ThemeModalContent
                            currentTab={currentTab}
                            themes={themes}
                            onSelectTheme={onSelectTheme}
                        />
                    }
                </div>
            </div>
        </Modal>
    );
};

export default ChangeThemeModal;
