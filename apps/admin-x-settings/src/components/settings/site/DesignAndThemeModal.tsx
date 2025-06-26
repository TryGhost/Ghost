import ChangeThemeModal from './ThemeModal';
import DesignModal from './DesignModal';
import NiceModal, {useModal} from '@ebay/nice-modal-react';
import React, {useEffect, useState} from 'react';
import {HostLimitError, useLimiter} from '../../../hooks/useLimiter';
import {LimitModal} from '@tryghost/admin-x-design-system';
import {RoutingModalProps, useRouting} from '@tryghost/admin-x-framework/routing';
import {useGlobalData} from '../../providers/GlobalDataProvider';

const DesignAndThemeModal: React.FC<RoutingModalProps> = ({pathName}) => {
    const modal = useModal();
    const limiter = useLimiter();
    const {config} = useGlobalData();
    const {updateRoute} = useRouting();
    const [themeLimitError, setThemeLimitError] = useState<string|null>(null);
    const [isCheckingLimit, setIsCheckingLimit] = useState(false);

    useEffect(() => {
        const checkIfThemeChangeAllowed = async () => {
            setIsCheckingLimit(true);
            // If the allowlist only contains one single entry, we can assume that the user
            // is not allowed to change themes at all.
            const numberOfAllowedThemes = config.hostSettings?.limits?.customThemes?.allowlist?.length;
            if (numberOfAllowedThemes === 1) {
                // Sending a bad string to make sure it fails (empty string isn't valid)
                await limiter?.errorIfWouldGoOverLimit('customThemes', {value: '.'}).catch((error) => {
                    if (error instanceof HostLimitError) {
                        setThemeLimitError(error?.message ?? 'Your current plan doesn\'t support changing themes.');
                    }
                });
            } else {
                // Ensure no error, if more than one theme is allowed
                setThemeLimitError(null);
            }
            setIsCheckingLimit(false);
        };

        if (pathName === 'design/change-theme' && limiter?.isLimited('customThemes')) {
            checkIfThemeChangeAllowed();
        } else {
            setThemeLimitError(null);
            setIsCheckingLimit(false);
        }
    }, [limiter, config.hostSettings?.limits?.customThemes?.allowlist?.length, pathName]);

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

        return <ChangeThemeModal source={source} themeRef={ref} />;
    } else {
        modal.remove();
    }
};

export default NiceModal.create(DesignAndThemeModal);
