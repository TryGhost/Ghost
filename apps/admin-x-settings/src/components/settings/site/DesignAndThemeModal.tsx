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
        };

        if (pathName === 'design/change-theme' && isThemeLimitCheckReady) {
            checkIfThemeChangeAllowed();
        } else {
            setThemeLimitError(null);
            setIsCheckingLimit(false);
        }
    }, [checkThemeLimitError, isThemeLimitCheckReady, pathName]);

    // Show limit modal if there's an error when accessing design/change-theme
    useEffect(() => {
        if (pathName === 'design/change-theme' && themeLimitError && !isCheckingLimit) {
            NiceModal.show(LimitModal, {
                prompt: themeLimitError,
                onOk: () => updateRoute({route: '/pro', isExternal: true})
            });
            modal.remove(); // Close the current modal
        }
    }, [themeLimitError, isCheckingLimit, pathName, updateRoute, modal]);

    if (pathName === 'design/edit') {
        return <DesignModal />;
    } else if (pathName === 'design/change-theme') {
        // Don't show the theme modal if we're still checking limits or if there's an error
        if (isCheckingLimit || themeLimitError) {
            return null;
        }
        return <ChangeThemeModal />;
    } else if (pathName === 'theme/install') {
        const url = window.location.href;
        const fragment = url.split('#')[1];
        const queryParams = fragment.split('?')[1];
        const searchParams = new URLSearchParams(queryParams);
        const ref = searchParams.get('ref') || null;
        const source = searchParams.get('source') || null;

        // Check if theme installation is limited
        if (isThemeLimitCheckReady && ref) {
            const themeName = ref.split('/')[1]?.toLowerCase();
            const isSingleTheme = allowedThemesList?.length === 1;

            // Check if theme installation will be blocked
            const isThemeInstallationBlocked = isSingleTheme || (allowedThemesList && !allowedThemesList.includes(themeName));
            
            // Show limit modal asynchronously if needed
            checkThemeLimitError(themeName)
                .then((error) => {
                    if (error) {
                        NiceModal.show(LimitModal, {
                            prompt: error,
                            onOk: () => updateRoute({route: '/pro', isExternal: true})
                        });

                        // Users with only one allowed theme should not be able to access the modal,
                        // as they can't change themes anyway.
                        if (isSingleTheme) {
                            modal.remove();
                            updateRoute('theme');
                        } else {
                            updateRoute('design/change-theme');
                        }
                    }
                });

            // Don't render the ChangeThemeModal if we know the installation will be blocked
            // This prevents UI issues with multiple modals and unnecessary rendering
            if (isThemeInstallationBlocked) {
                return null;
            }
        }

        // If limiter isn't initialized yet, don't render the modal
        if (!isThemeLimitCheckReady && allowedThemesList) {
            return null;
        }

        return <ChangeThemeModal source={source} themeRef={ref} />;
    } else {
        modal.remove();
    }
};

export default NiceModal.create(DesignAndThemeModal);
