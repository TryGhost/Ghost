import ChangeThemeModal from './ThemeModal';
import DesignModal from './DesignModal';
import NiceModal, {useModal} from '@ebay/nice-modal-react';
import React, {useEffect, useState} from 'react';
import {LimitModal} from '@tryghost/admin-x-design-system';
import {RoutingModalProps, useRouting} from '@tryghost/admin-x-framework/routing';
import {useCheckThemeLimitError} from '../../../hooks/useCheckThemeLimitError';

const DesignAndThemeModal: React.FC<RoutingModalProps> = ({pathName}) => {
    const modal = useModal();
    const {updateRoute} = useRouting();
    const [themeChangeError, setThemeChangeError] = useState<string|null>(null);
    const [isCheckingLimit, setIsCheckingLimit] = useState(false);
    const [isCheckingInstallation, setIsCheckingInstallation] = useState(false);
    const {checkThemeLimitError, isThemeLimitCheckReady, noThemeChangesAllowed, isThemeLimited} = useCheckThemeLimitError();
    const [installationAllowed, setInstallationAllowed] = useState<boolean | null>(null);

    useEffect(() => {
        const checkIfThemeChangeAllowed = async () => {
            setIsCheckingLimit(true);
            const error = await checkThemeLimitError();
            setThemeChangeError(error);
            setIsCheckingLimit(false);

            // Show limit modal immediately if there's an error
            if (error) {
                NiceModal.show(LimitModal, {
                    prompt: error,
                    onOk: () => updateRoute({route: '/pro', isExternal: true})
                });
                modal.remove(); // Close the current modal
            }
        };

        if (pathName === 'design/change-theme' && isThemeLimitCheckReady) {
            checkIfThemeChangeAllowed();
        } else {
            setThemeChangeError(null);
            setIsCheckingLimit(false);
        }
    }, [checkThemeLimitError, isThemeLimitCheckReady, pathName, modal, updateRoute]);

    // Check theme installation limits
    useEffect(() => {
        const checkThemeInstallation = async () => {
            if (pathName === 'theme/install') {
                if (!isThemeLimitCheckReady) {
                    // Still loading limit check
                    setIsCheckingInstallation(true);
                    return;
                }
                
                setIsCheckingInstallation(true);
                const url = window.location.href;
                const fragment = url.split('#')[1];
                const queryParams = fragment?.split('?')[1];

                if (queryParams) {
                    const searchParams = new URLSearchParams(queryParams);
                    const ref = searchParams.get('ref');

                    if (ref) {
                        const themeName = ref.split('/')[1]?.toLowerCase();
                        
                        // Let the hook handle all the logic about whether to show an error
                        const error = await checkThemeLimitError(themeName);
                        if (error) {
                            setInstallationAllowed(false);
                            
                            // Redirect based on whether theme changes are allowed
                            if (noThemeChangesAllowed) {
                                // Single theme - show limit modal and redirect to /theme
                                NiceModal.show(LimitModal, {
                                    prompt: error,
                                    onOk: () => updateRoute({route: '/pro', isExternal: true})
                                });
                                modal.remove();
                                updateRoute('theme');
                            } else {
                                // Multiple themes allowed - redirect to change-theme and show limit modal there
                                // Clear the current modal first
                                modal.remove();
                                updateRoute('design/change-theme');
                                // Show the limit modal after a small delay to ensure the route change happens first
                                setTimeout(() => {
                                    NiceModal.show(LimitModal, {
                                        prompt: error,
                                        onOk: () => updateRoute({route: '/pro', isExternal: true})
                                    });
                                }, 100);
                            }
                        } else {
                            // Installation is allowed
                            setInstallationAllowed(true);
                        }
                        setIsCheckingInstallation(false);
                    } else {
                        // No ref param, don't allow installation (invalid URL)
                        setInstallationAllowed(false);
                        setIsCheckingInstallation(false);
                    }
                } else {
                    // No query params, don't allow installation (invalid URL)
                    setInstallationAllowed(false);
                    setIsCheckingInstallation(false);
                }
            } else {
                // Not on theme/install path
                setIsCheckingInstallation(false);
            }
        };

        checkThemeInstallation();
    }, [pathName, isThemeLimitCheckReady, checkThemeLimitError, noThemeChangesAllowed, isThemeLimited, modal, updateRoute]);

    if (pathName === 'design/edit') {
        return <DesignModal />;
    } else if (pathName === 'design/change-theme') {
        // Don't show the change theme modal if we're still checking limits or if there's
        // a theme limit error
        if (isCheckingLimit || themeChangeError) {
            return null;
        }
        
        return <ChangeThemeModal />;
    } else if (pathName === 'theme/install') {
        // Parse URL params inline since we need them immediately
        const url = window.location.href;
        const fragment = url.split('#')[1];
        const queryParams = fragment?.split('?')[1];
        let ref: string | null = null;
        let source: string | null = null;

        if (queryParams) {
            const searchParams = new URLSearchParams(queryParams);
            ref = searchParams.get('ref');
            source = searchParams.get('source');
        }

        // Don't render the modal if limits aren't ready yet or we're still checking
        // or if we haven't determined if installation is allowed yet
        if (!isThemeLimitCheckReady || isCheckingInstallation || installationAllowed === null) {
            return null;
        }

        // If installation is not allowed, we've already shown the limit modal
        if (!installationAllowed) {
            return null;
        }

        // Installation is allowed, render the ChangeThemeModal with the source and ref
        return <ChangeThemeModal source={source} themeRef={ref} />;
    } else {
        modal.remove();
    }
};

export default NiceModal.create(DesignAndThemeModal);
