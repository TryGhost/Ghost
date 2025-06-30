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
    const {checkThemeLimitError, isThemeLimitCheckReady, noThemeChangesAllowed, isThemeLimited, allowedThemesList} = useCheckThemeLimitError();
    const [installationAllowed, setInstallationAllowed] = useState<boolean | null>(null);

    useEffect(() => {
        const checkIfThemeChangeAllowed = async () => {
            // Only check limits if we have a single-theme allowlist
            // Multiple themes don't need this check since users can change between allowed themes
            if (!noThemeChangesAllowed) {
                setIsCheckingLimit(false);
                setThemeChangeError(null);
                return;
            }

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
    }, [checkThemeLimitError, isThemeLimitCheckReady, pathName, modal, updateRoute, noThemeChangesAllowed]);

    // Check theme installation limits
    useEffect(() => {
        // Helper to extract theme ref from URL
        const getThemeRefFromUrl = () => {
            const url = window.location.href;
            const fragment = url.split('#')[1];
            const queryParams = fragment?.split('?')[1];
            
            if (!queryParams) {
                return null;
            }
            
            const searchParams = new URLSearchParams(queryParams);
            return searchParams.get('ref');
        };

        // Helper to handle theme limit error
        const handleThemeLimitError = (error: string) => {
            const limitModalConfig = {
                prompt: error,
                onOk: () => updateRoute({route: '/pro', isExternal: true})
            };

            if (noThemeChangesAllowed) {
                // Single theme - show limit modal and redirect to /theme
                NiceModal.show(LimitModal, limitModalConfig);
                modal.remove();
                updateRoute('theme');
            } else {
                // Multiple themes allowed - redirect to change-theme and show limit modal there
                modal.remove();
                updateRoute('design/change-theme');
                // Show the limit modal after a small delay to ensure the route change happens first
                setTimeout(() => {
                    NiceModal.show(LimitModal, limitModalConfig);
                }, 100);
            }
        };

        const checkThemeInstallation = async () => {
            // Early return if not on theme/install path
            if (pathName !== 'theme/install') {
                setIsCheckingInstallation(false);
                return;
            }

            // Still loading limit check
            if (!isThemeLimitCheckReady) {
                setIsCheckingInstallation(true);
                return;
            }
            
            setIsCheckingInstallation(true);
            
            const ref = getThemeRefFromUrl();
            
            if (!ref) {
                // Invalid URL - no ref param
                setInstallationAllowed(false);
                setIsCheckingInstallation(false);
                return;
            }

            const themeName = ref.split('/')[1]?.toLowerCase();
            const error = await checkThemeLimitError(themeName);
            
            if (error) {
                setInstallationAllowed(false);
                handleThemeLimitError(error);
            } else {
                setInstallationAllowed(true);
            }
            
            setIsCheckingInstallation(false);
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
        // Don't render the modal if limits aren't ready yet
        if (!isThemeLimitCheckReady) {
            return null;
        }

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

        // Check if the theme installation will be blocked
        // This prevents the modal from being created before the useEffect runs
        if (ref && allowedThemesList) {
            const themeName = ref.split('/')[1]?.toLowerCase();
            const isThemeInstallationBlocked = noThemeChangesAllowed || !allowedThemesList.includes(themeName);
            
            if (isThemeInstallationBlocked) {
                // The useEffect will handle showing the limit modal and redirecting
                return null;
            }
        }

        // Don't render if we're still checking or if we haven't determined if installation is allowed yet
        if (isCheckingInstallation || installationAllowed === null) {
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
