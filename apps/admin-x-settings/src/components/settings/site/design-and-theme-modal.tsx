import ChangeThemeModal from './theme-modal';
import DesignModal from './design-modal';
import NiceModal, {useModal} from '@ebay/nice-modal-react';
import React, {useCallback, useEffect, useState} from 'react';
import ThemeCodeEditorModal from './theme/theme-code-editor-modal';
import {LimitModal} from '@tryghost/admin-x-design-system';
import {type RoutingModalProps, useRouting} from '@tryghost/admin-x-framework/routing';
import {useCheckThemeLimitError} from '../../../hooks/use-check-theme-limit-error';

const parseEditingThemeRoute = (path: string): {themeName: string | null; isInvalid: boolean} => {
    if (!path.startsWith('theme/edit/')) {
        return {
            themeName: null,
            isInvalid: false
        };
    }

    const encodedThemeName = path.slice('theme/edit/'.length).split('?')[0];

    if (!encodedThemeName) {
        return {
            themeName: null,
            isInvalid: true
        };
    }

    try {
        return {
            themeName: decodeURIComponent(encodedThemeName),
            isInvalid: false
        };
    } catch {
        return {
            themeName: null,
            isInvalid: true
        };
    }
};

const DesignAndThemeModal: React.FC<RoutingModalProps> = ({pathName}) => {
    const modal = useModal();
    const {route, updateRoute} = useRouting();
    const currentPath = route || pathName;
    const [themeChangeError, setThemeChangeError] = useState<string|null>(null);
    const [isCheckingLimit, setIsCheckingLimit] = useState(false);
    const [isCheckingInstallation, setIsCheckingInstallation] = useState(false);
    const [editorThemeError, setEditorThemeError] = useState<string | null>(null);
    const [isCheckingEditorLimit, setIsCheckingEditorLimit] = useState(false);
    const {checkThemeLimitError, isThemeLimitCheckReady, noThemeChangesAllowed, isThemeLimited} = useCheckThemeLimitError();
    const [installationAllowed, setInstallationAllowed] = useState<boolean | null>(null);
    const [hasCheckedInstallation, setHasCheckedInstallation] = useState(false);
    const {themeName: editingThemeName, isInvalid: hasInvalidEditingThemeRoute} = parseEditingThemeRoute(currentPath);

    const showThemeLimitModal = useCallback((error: string) => {
        NiceModal.show(LimitModal, {
            prompt: error,
            onOk: () => updateRoute({route: '/pro', isExternal: true})
        });
    }, [updateRoute]);

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
                showThemeLimitModal(error);
                modal.remove(); // Close the current modal
            }
        };

        if (currentPath === 'design/change-theme' && isThemeLimitCheckReady) {
            checkIfThemeChangeAllowed();
        } else {
            setThemeChangeError(null);
            setIsCheckingLimit(false);
        }
    }, [checkThemeLimitError, currentPath, isThemeLimitCheckReady, modal, noThemeChangesAllowed, showThemeLimitModal]);

    // Reset states when pathName changes
    useEffect(() => {
        if (currentPath !== 'theme/install') {
            setHasCheckedInstallation(false);
            setInstallationAllowed(null);
            setIsCheckingInstallation(false);
        }
    }, [currentPath]);

    useEffect(() => {
        if (!hasInvalidEditingThemeRoute) {
            return;
        }

        modal.remove();
        updateRoute('theme');
    }, [hasInvalidEditingThemeRoute, modal, updateRoute]);

    useEffect(() => {
        let isCancelled = false;

        const checkThemeEditorAccess = async () => {
            if (!editingThemeName) {
                setEditorThemeError(null);
                setIsCheckingEditorLimit(false);
                return;
            }

            if (!isThemeLimitCheckReady) {
                setIsCheckingEditorLimit(true);
                return;
            }

            if (!isThemeLimited) {
                setEditorThemeError(null);
                setIsCheckingEditorLimit(false);
                return;
            }

            setIsCheckingEditorLimit(true);

            const error = await checkThemeLimitError(editingThemeName.toLowerCase());

            if (isCancelled) {
                return;
            }

            setEditorThemeError(error);
            setIsCheckingEditorLimit(false);

            if (error) {
                showThemeLimitModal(error);
                modal.remove();
                updateRoute('theme');
            }
        };

        void checkThemeEditorAccess();

        return () => {
            isCancelled = true;
        };
    }, [checkThemeLimitError, editingThemeName, isThemeLimitCheckReady, isThemeLimited, modal, showThemeLimitModal, updateRoute]);

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

            if (noThemeChangesAllowed) {
                // Single theme - show limit modal and redirect to /theme
                showThemeLimitModal(error);
                // Clear URL parameters
                window.history.replaceState({}, '', window.location.pathname + window.location.hash.split('?')[0]);
                modal.remove();
                updateRoute('theme');
            } else {
                // Multiple themes allowed - show limit modal and then redirect
                showThemeLimitModal(error);
                modal.remove();
                // Don't redirect to change-theme modal - just stay on current route
                // This prevents both modals from being visible at the same time
                updateRoute('theme');
            }
        };

        const checkThemeInstallation = async () => {
            // Early return if not on theme/install path
            if (currentPath !== 'theme/install') {
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
            if (currentPath !== 'theme/install') {
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
    }, [checkThemeLimitError, currentPath, isThemeLimitCheckReady, noThemeChangesAllowed, isThemeLimited, modal, showThemeLimitModal, updateRoute]);

    if (currentPath === 'design/edit') {
        return <DesignModal />;
    } else if (currentPath === 'design/change-theme') {
        // Don't show the change theme modal if we're still checking limits or if there's
        // a theme limit error
        if (isCheckingLimit || themeChangeError) {
            return null;
        }

        return <ChangeThemeModal />;
    } else if (currentPath === 'theme/install') {
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
    } else if (currentPath.startsWith('theme/edit/')) {
        if (hasInvalidEditingThemeRoute || !editingThemeName || isCheckingEditorLimit || editorThemeError) {
            return null;
        }

        return <ThemeCodeEditorModal themeName={editingThemeName} />;
    } else {
        modal.remove();
        return null;
    }
};

export default NiceModal.create(DesignAndThemeModal);
