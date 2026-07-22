import KoenigComposerContext from '../../src/context/KoenigComposerContext';
import {InputUrlSetting} from '../../src/components/ui/SettingsPanel';
import {fireEvent, render, screen} from '@testing-library/react';
import {vi} from 'vitest';

describe('InputUrlSetting', () => {
    it('can exclude autocomplete destinations', async () => {
        const fetchAutocompleteLinks = vi.fn().mockResolvedValue([
            {label: 'Homepage', value: 'https://example.com/'},
            {label: 'Free signup', value: '#/portal/signup/free'},
            {label: 'Paid signup', value: '#/portal/signup'},
            {label: 'Upgrade or change plan', value: '#/portal/account/plans'},
            {label: 'Gift subscriptions', value: '#/portal/gift'},
            {label: 'Share post', value: '#/share'},
            {label: 'Summer offer', value: 'https://example.com/?offer=summer'}
        ]);

        render(
            <KoenigComposerContext.Provider value={{cardConfig: {fetchAutocompleteLinks}, darkMode: false}}>
                <InputUrlSetting
                    dataTestId="button-url"
                    excludedValues={[
                        '#/portal/account/plans',
                        '#/portal/gift',
                        '#/portal/signup/free',
                        '#/share'
                    ]}
                    label="Button URL"
                    value=""
                    onChange={vi.fn()}
                />
            </KoenigComposerContext.Provider>
        );

        fireEvent.focus(screen.getByTestId('button-url'));

        expect(await screen.findByText('Paid signup')).toBeInTheDocument();
        expect(screen.getByText('Homepage')).toBeInTheDocument();
        expect(screen.getByText('Summer offer')).toBeInTheDocument();
        expect(screen.queryByText('Free signup')).not.toBeInTheDocument();
        expect(screen.queryByText('Upgrade or change plan')).not.toBeInTheDocument();
        expect(screen.queryByText('Gift subscriptions')).not.toBeInTheDocument();
        expect(screen.queryByText('Share post')).not.toBeInTheDocument();
    });
});
