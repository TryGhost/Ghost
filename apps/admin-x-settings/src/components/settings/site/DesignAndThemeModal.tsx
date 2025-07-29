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
    const [hasCheckedInstallation, setHasCheckedInstallation] = useState(false);

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

    // Reset states when pathName changes
    useEffect(() => {
        if (pathName !== 'theme/install') {
            setHasCheckedInstallation(false);
            setInstallationAllowed(null);
            setIsCheckingInstallation(false);
        }
    }, [pathName]);

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
            // Immediately prevent any installation attempts
            setInstallationAllowed(false);

            const limitModalConfig = {
                prompt: error,
                onOk: () => updateRoute({route: '/pro', isExternal: true})
            };

            if (noThemeChangesAllowed) {
                // Single theme - show limit modal and redirect to /theme
                NiceModal.show(LimitModal, limitModalConfig);
                // Clear URL parameters
                window.history.replaceState({}, '', window.location.pathname + window.location.hash.split('?')[0]);
                modal.remove();
                updateRoute('theme');
            } else {
                // Multiple themes allowed - show limit modal and then redirect
                NiceModal.show(LimitModal, limitModalConfig);
                modal.remove();
                // Don't redirect to change-theme modal - just stay on current route
                // This prevents both modals from being visible at the same time
                updateRoute('theme');
            }
        };

        const checkThemeInstallation = async () => {
            // Early return if not on theme/install path
            if (pathName !== 'theme/install') {
                setIsCheckingInstallation(false);
                return;
            }

            // Mark that we've started checking
            setHasCheckedInstallation(true);

            // Still loading limit check
            if (!isThemeLimitCheckReady) {
                setIsCheckingInstallation(true);
                return;
            }

            // If there are no theme limits at all, allow installation
            if (!isThemeLimited) {
                setInstallationAllowed(true);
                setIsCheckingInstallation(false);
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

            // Double-check again after async operation
            if (pathName !== 'theme/install') {
                setIsCheckingInstallation(false);
                return;
            }

            if (error) {
                // Immediately set these to prevent any rendering
                setInstallationAllowed(false);
                setIsCheckingInstallation(false);
                handleThemeLimitError(error);
                // Don't continue after showing limit modal
                // This prevents the race condition
                return;
            }

            setInstallationAllowed(true);
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
        // Always wait for the installation check to complete
        // This prevents any race conditions
        if (!hasCheckedInstallation || !isThemeLimitCheckReady || isCheckingInstallation || installationAllowed === null) {
            return null;
        }

        // If installation is not allowed, don't render anything
        // The limit modal has already been shown and we're redirecting
        if (!installationAllowed) {
            return null;
        }

        // Parse URL params only after we know installation is allowed
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

        // Installation is allowed, render the ChangeThemeModal with the source and ref
        return <ChangeThemeModal source={source} themeRef={ref} />;
    } else {
        modal.remove();
    }
};

export default NiceModal.create(DesignAndThemeModal);
