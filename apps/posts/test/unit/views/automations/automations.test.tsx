import Automations from '@src/views/Automations/automations';
import NiceModal from '@ebay/nice-modal-react';
import React from 'react';
import {beforeEach, describe, expect, it, vi} from 'vitest';
import {fireEvent, render, screen} from '@testing-library/react';

const mockUseBrowseAutomations = vi.fn();
const mockUseBrowseSettings = vi.fn();
const mockUseBrowseSite = vi.fn();
const mockUseBrowseConfig = vi.fn();
const mockUseCurrentUser = vi.fn();

vi.mock('@tryghost/admin-x-framework/api/automations', () => ({
    useBrowseAutomations: (...args: unknown[]) => mockUseBrowseAutomations(...args)
}));

vi.mock('@tryghost/admin-x-framework/api/settings', () => ({
    useBrowseSettings: () => mockUseBrowseSettings()
}));

vi.mock('@tryghost/admin-x-framework/api/site', () => ({
    useBrowseSite: () => mockUseBrowseSite()
}));

vi.mock('@tryghost/admin-x-framework/api/config', () => ({
    useBrowseConfig: () => mockUseBrowseConfig()
}));

vi.mock('@tryghost/admin-x-framework/api/current-user', () => ({
    useCurrentUser: () => mockUseCurrentUser()
}));

vi.mock('@tryghost/admin-x-settings/src/components/settings/membership/member-emails/welcome-email-customize-modal', () => ({
    default: function WelcomeEmailCustomizeModal() {
        return null;
    }
}));

vi.mock('@tryghost/admin-x-settings/src/components/providers/global-data-provider', () => ({
    GlobalDataStaticProvider: ({children}: {children: React.ReactNode}) => <>{children}</>
}));

vi.mock('@src/components/layout/main-layout', () => ({
    default: ({children}: {children: React.ReactNode}) => <>{children}</>
}));

const loadedRequest = (data: unknown) => ({
    data,
    error: null,
    isLoading: false
});

describe('Automations', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockUseBrowseAutomations.mockReturnValue(loadedRequest({automations: []}));
        mockUseBrowseSettings.mockReturnValue(loadedRequest({settings: []}));
        mockUseBrowseSite.mockReturnValue(loadedRequest({site: {}}));
        mockUseBrowseConfig.mockReturnValue(loadedRequest({config: {}}));
        mockUseCurrentUser.mockReturnValue(loadedRequest({id: 'user-id'}));
    });

    it('shows an Email design button in the header that opens the welcome email customize modal', () => {
        const showSpy = vi.spyOn(NiceModal, 'show').mockResolvedValue(undefined);

        render(<Automations />);

        fireEvent.click(screen.getByRole('button', {name: 'Email design'}));

        expect(showSpy).toHaveBeenCalledWith(expect.any(Function), {title: 'Email design'});
    });
});
