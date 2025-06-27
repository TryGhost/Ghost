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
    const [themeLimitError, setThemeLimitError] = useState<string|null>(null);
    const [isCheckingLimit, setIsCheckingLimit] = useState(false);
    const {checkThemeLimitError, isThemeLimitCheckReady, allowedThemesList} = useCheckThemeLimitError();

    useEffect(() => {
        const checkIfThemeChangeAllowed = async () => {
            setIsCheckingLimit(true);
            const error = await checkThemeLimitError();
            setThemeLimitError(error);
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
            setThemeLimitError(null);
            setIsCheckingLimit(false);
        }
    }, [checkThemeLimitError, isThemeLimitCheckReady, pathName, modal, updateRoute]);


    // Check theme installation limits
    useEffect(() => {
        const checkThemeInstallation = async () => {
            if (pathName === 'theme/install' && isThemeLimitCheckReady) {
                // Parse URL params
                const url = window.location.href;
                const fragment = url.split('#')[1];
                const queryParams = fragment?.split('?')[1];
                
                if (queryParams) {
                    const searchParams = new URLSearchParams(queryParams);
                    const ref = searchParams.get('ref');
                    
                    if (ref) {
                        const themeName = ref.split('/')[1]?.toLowerCase();
                        const isSingleTheme = allowedThemesList?.length === 1;
                        
                        // Check if theme installation will be blocked
                        const isThemeInstallationBlocked = isSingleTheme || (allowedThemesList && !allowedThemesList.includes(themeName));
                        
                        if (isThemeInstallationBlocked) {
                            const error = await checkThemeLimitError(themeName);
                            if (error) {
                                NiceModal.show(LimitModal, {
                                    prompt: error,
                                    onOk: () => updateRoute({route: '/pro', isExternal: true})
                                });
                                
                                if (isSingleTheme) {
                                    modal.remove();
                                    updateRoute('theme');
                                } else {
                                    updateRoute('design/change-theme');
                                }
                            }
                        }
                    }
                }
            }
        };
        
        checkThemeInstallation();
    }, [pathName, isThemeLimitCheckReady, allowedThemesList, checkThemeLimitError, modal, updateRoute]);

    if (pathName === 'design/edit') {
        return <DesignModal />;
    } else if (pathName === 'design/change-theme') {
        // Don't show the theme modal if we're still checking limits or if there's an error
        if (isCheckingLimit || themeLimitError) {
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

        // Don't render the modal if limits aren't ready yet
        if (!isThemeLimitCheckReady) {
            return null;
        }

        // Only check for blocking if there are actual limits (allowedThemesList is defined)
        if (ref && allowedThemesList) {
            const themeName = ref.split('/')[1]?.toLowerCase();
            const isSingleTheme = allowedThemesList.length === 1;
            const isThemeInstallationBlocked = isSingleTheme || !allowedThemesList.includes(themeName);
            
            if (isThemeInstallationBlocked) {
                // The useEffect will handle showing the limit modal
                return null;
            }
        }

        return <ChangeThemeModal source={source} themeRef={ref} />;
    } else {
        modal.remove();
    }
};

export default NiceModal.create(DesignAndThemeModal);
